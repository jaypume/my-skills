#!/usr/bin/env node
// 根据 YAML 白名单同步第三方技能与 agent 入口。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import spawn from 'cross-spawn';
import { parseDocument } from 'yaml';
import { parse as parseToml } from 'smol-toml';

export class SyncError extends Error {}

const NAME = /^[a-z0-9][a-z0-9-]*$/;
const SOURCE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const initialState = () => ({ version: 1, skills: {}, links: {} });
const sortedEntries = value => Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
const sourceOf = (records, name) => records[name]?.source ?? '';

function object(value, label) {
  if (!isObject(value)) throw new SyncError(`${label} must be a mapping`);
  return value;
}

function knownKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  if (unknown.length) throw new SyncError(`Unknown ${label} key: ${unknown.join(', ')}`);
}

function validName(name) {
  if (typeof name !== 'string' || !NAME.test(name)) {
    throw new SyncError(`Invalid skill/agent name: ${JSON.stringify(name)}`);
  }
  return name;
}

export function githubSource(url) {
  // 先校验原始字符串，避免 URL 自动折叠路径后掩盖 ../ 等误配置。
  if (typeof url !== 'string' || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/i.test(url)) {
    throw new SyncError(`Expected a GitHub repository URL: ${url}`);
  }
  const parts = url.replace(/\/$/, '').split('/').slice(-2);
  parts[1] = parts[1].replace(/\.git$/i, '');
  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new SyncError(`Invalid GitHub repository URL: ${url}`);
  }
  return parts.join('/');
}

export function exists(file) {
  try { fs.lstatSync(file); return true; }
  catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return false;
    throw error;
  }
}

function isSymlink(file) {
  return exists(file) && fs.lstatSync(file).isSymbolicLink();
}

function isFile(file) {
  try { return fs.statSync(file).isFile(); }
  catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return false;
    throw error;
  }
}

function realPath(file) {
  try { return fs.realpathSync(file); }
  catch (error) {
    if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
    const parent = path.dirname(file);
    return parent === file ? file : path.join(realPath(parent), path.basename(file));
  }
}

export function linkTarget(file) {
  return isSymlink(file) ? path.resolve(path.dirname(file), fs.readlinkSync(file)) : null;
}

export function readJson(file, fallback) {
  if (!exists(file)) return fallback;
  try { return object(JSON.parse(fs.readFileSync(file, 'utf8')), `JSON in ${file}`); }
  catch (error) { throw new SyncError(`Cannot read ${file}: ${error.message}`); }
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (isObject(value)) return Object.fromEntries(sortedEntries(value).map(([key, item]) => [key, stableJson(item)]));
  return value;
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(stableJson(value), null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    if (exists(temporary)) fs.unlinkSync(temporary);
  }
}

function agentFields(value, name) {
  const fields = typeof value === 'string' ? { path: value } : object(value, `Agent ${name}`);
  knownKeys(fields, ['path', 'enabled', 'skills'], 'agent configuration');
  return fields;
}

export class SkillSync {
  constructor(repo, config = path.join(repo, 'skills.yaml'), { home = os.homedir(), cli, log = console.log } = {}) {
    this.repo = fs.realpathSync(repo);
    this.home = path.resolve(home);
    this.library = path.join(this.home, '.agents/skills');
    this.localLibrary = path.join(this.repo, 'skills');
    this.lockPath = path.join(this.home, '.agents/.skill-lock.json');
    this.stateDir = path.join(this.repo, '.local/skill-sync');
    this.statePath = path.join(this.stateDir, 'state.json');
    this.cli = cli ?? this.runCli.bind(this);
    this.log = log;
    if (this.home !== path.resolve(os.homedir()) && !cli) {
      throw new SyncError('A custom home requires an explicit CLI runner');
    }
    let overrides;
    try {
      const document = parseDocument(fs.readFileSync(config, 'utf8'), { strict: true, uniqueKeys: true });
      if (document.errors.length || document.warnings.length) throw document.errors[0] ?? document.warnings[0];
      this.config = object(document.toJS({ maxAliasCount: 0 }), 'Configuration');
      const local = path.join(this.home, '.config/my-skills/config.toml');
      const localConfig = exists(local) ? parseToml(fs.readFileSync(local, 'utf8')) : {};
      overrides = object(localConfig['skill-sync']?.agents ?? {}, 'Local agent overrides');
    } catch (error) { throw new SyncError(`Cannot read configuration: ${error.message}`); }
    knownKeys(this.config, ['local', 'agents', 'repositories'], 'top-level configuration');
    // 两个入口必须显式存在，避免意外保存空文件后卸载所有已管理技能。
    const repositories = object(this.config.repositories, 'repositories');
    const agents = object(this.config.agents, 'agents');
    const local = object(this.config.local ?? {}, 'local');
    knownKeys(local, ['include_tracked'], 'local configuration');
    if (Object.hasOwn(local, 'include_tracked') && typeof local.include_tracked !== 'boolean') {
      throw new SyncError('local.include_tracked must be a boolean');
    }
    this.skills = {};
    const sources = new Set();
    for (const [url, names] of Object.entries(repositories)) {
      const source = githubSource(url);
      if (sources.has(source.toLowerCase())) throw new SyncError(`Duplicate repository: ${url}`);
      sources.add(source.toLowerCase());
      if (!Array.isArray(names) || !names.length) throw new SyncError(`Expected a nonempty skill allowlist for ${url}`);
      for (const name of names) {
        validName(name);
        if (Object.hasOwn(this.skills, name)) throw new SyncError(`Duplicate declared skill: ${name}`);
        this.skills[name] = source;
      }
    }
    const merged = Object.fromEntries(Object.entries(agents).map(([name, value]) => [validName(name), agentFields(value, name)]));
    for (const [name, value] of Object.entries(overrides)) {
      validName(name);
      merged[name] = { ...(Object.hasOwn(merged, name) ? merged[name] : {}), ...agentFields(value, name) };
    }
    this.agents = {};
    for (const [name, values] of Object.entries(merged)) {
      validName(name);
      const enabled = Object.hasOwn(values, 'enabled') ? values.enabled : true;
      if (typeof enabled !== 'boolean') throw new SyncError(`Invalid agent configuration: ${name}`);
      const raw = values.path;
      if (typeof raw !== 'string' || !raw) throw new SyncError(`Agent path is required: ${name}`);
      if (!raw.startsWith('~/') && !path.isAbsolute(raw)) {
        throw new SyncError(`Agent path must be absolute or start with ~/: ${name}`);
      }
      const directory = raw.startsWith('~/') ? path.resolve(this.home, raw.slice(2)) : path.resolve(raw);
      if (directory === this.home || directory === path.parse(directory).root || path.basename(directory) !== 'skills') {
        throw new SyncError(`Agent path must name a skills directory: ${name}`);
      }
      if (realPath(directory) !== realPath(this.localLibrary) && Object.values(this.agents).some(item => realPath(item.path) === realPath(directory))) {
        throw new SyncError(`Multiple agents share a writable link directory: ${directory}`);
      }
      const selected = Object.hasOwn(values, 'skills') ? values.skills : ['*'];
      if (!Array.isArray(selected) || !selected.every(item => typeof item === 'string')) {
        throw new SyncError(`Invalid agent skill selection: ${name}`);
      }
      for (const item of selected) if (item !== '*') validName(item);
      this.agents[name] = { path: directory, enabled, skills: selected };
    }
    this.state = readJson(this.statePath, initialState());
    this.validateState();
  }

  validateState() {
    if (this.state.version !== 1 || !isObject(this.state.skills) || !isObject(this.state.links)) {
      throw new SyncError('Unsupported local sync state version');
    }
    for (const [name, source] of Object.entries(this.state.skills)) {
      validName(name);
      if (typeof source !== 'string' || !SOURCE.test(source)) throw new SyncError(`Invalid managed source: ${name}`);
    }
    for (const [key, target] of Object.entries(this.state.links)) {
      if (typeof target !== 'string' || !path.isAbsolute(key) || !path.isAbsolute(target) ||
          path.basename(key).startsWith('.') || path.basename(path.dirname(key)) !== 'skills' || path.dirname(target) !== this.library) {
        throw new SyncError(`Invalid managed link record: ${key}`);
      }
    }
  }

  runCli(args) {
    const command = ['--yes', 'skills', ...args];
    const result = spawn.sync('npx', command, { cwd: this.repo, encoding: 'utf8', timeout: 300_000, maxBuffer: 16 * 1024 * 1024 });
    const transcript = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    fs.mkdirSync(this.stateDir, { recursive: true });
    fs.appendFileSync(path.join(this.stateDir, 'cli.log'), `\n${JSON.stringify(['npx', ...command])}\n${transcript}\n`);
    if (result.error || result.status !== 0 || transcript.includes('No matching skills found')) {
      throw new SyncError(`skills CLI failed${result.error ? `: ${result.error.message}` : ''}; see ${path.join(this.stateDir, 'cli.log')}\n${transcript.slice(-2000)}`);
    }
  }

  localSkills() {
    if (this.config.local?.include_tracked === false) return new Set();
    const result = spawn.sync('git', ['ls-files', '-z', '--', 'skills'], { cwd: this.repo, encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new SyncError(`Cannot list tracked skills: ${result.error?.message ?? result.stderr}`);
    const names = new Set();
    for (const entry of result.stdout.split('\0')) {
      const parts = entry.split('/');
      if (parts.length === 3 && parts[0] === 'skills' && parts[2] === 'SKILL.md') {
        const name = validName(parts[1]);
        if (!isFile(path.join(this.localLibrary, name, 'SKILL.md'))) throw new SyncError(`Tracked local skill is missing: ${name}`);
        names.add(name);
      }
    }
    return names;
  }

  lock() {
    const value = readJson(this.lockPath, { version: 3, skills: {} });
    if (!isObject(value.skills)) throw new SyncError('Invalid skills CLI lock');
    return value;
  }

  verifyLibrary() {
    if (exists(this.library) && realPath(this.library) !== realPath(this.localLibrary)) {
      throw new SyncError(`Shared library does not point to ${this.localLibrary}: ${this.library}; reconcile it with chezmoi first`);
    }
  }

  plan({ update = false } = {}) {
    this.verifyLibrary();
    const local = this.localSkills();
    for (const name of local) if (Object.hasOwn(this.skills, name)) throw new SyncError(`Third-party name collides with a tracked local skill: ${name}`);
    const records = this.lock().skills;
    const previous = this.state.skills;
    const install = [], adopt = [], remove = [];
    for (const [name, source] of sortedEntries(this.skills)) {
      const directory = path.join(this.library, name);
      const present = exists(directory);
      const oldSource = Object.hasOwn(previous, name) ? previous[name] : undefined;
      if (present) {
        if (isSymlink(directory) || !isFile(path.join(directory, 'SKILL.md'))) throw new SyncError(`Refusing to replace non-package entry: ${directory}`);
        if (sourceOf(records, name).toLowerCase() !== (oldSource ?? source).toLowerCase()) {
          throw new SyncError(`Unmanaged or replaced package at ${directory}: recorded source ${JSON.stringify(sourceOf(records, name))}`);
        }
      }
      if (!present || update || (oldSource && oldSource !== source)) install.push(name);
      else if (!Object.hasOwn(previous, name)) adopt.push(name);
    }
    for (const [name, source] of sortedEntries(previous)) {
      if (Object.hasOwn(this.skills, name)) continue;
      const directory = path.join(this.library, name);
      if (local.has(name)) throw new SyncError(`Previously managed package became a tracked local skill: ${name}`);
      if (exists(directory) && (isSymlink(directory) || sourceOf(records, name).toLowerCase() !== source.toLowerCase())) {
        throw new SyncError(`Refusing to remove changed ownership: ${directory}`);
      }
      remove.push(name);
    }
    const { actions: links, warnings } = this.linkPlan(new Set([...Object.keys(this.skills), ...local]), new Set(remove));
    const extras = exists(this.localLibrary) ? fs.readdirSync(this.localLibrary).filter(name =>
      !name.startsWith('.') && isFile(path.join(this.localLibrary, name, 'SKILL.md')) &&
      !Object.hasOwn(this.skills, name) && !local.has(name) && !remove.includes(name)).sort() : [];
    return { install, adopt, remove, links, warnings, extras, local: [...local].sort() };
  }

  linkPlan(names, removed) {
    const actions = [], warnings = [];
    const desired = new Map(), inspected = new Set();
    const owned = this.state.links;
    for (const [agent, settings] of Object.entries(this.agents)) {
      const directory = settings.path;
      if (realPath(directory) === realPath(this.localLibrary) || directory === this.library) {
        if (!settings.enabled) warnings.push(`${agent}: shared-directory discovery remains active; enabled controls link maintenance only`);
        continue;
      }
      if (isSymlink(directory)) throw new SyncError(`Agent skills directory is a symlink to another library: ${directory}`);
      const unknown = settings.skills.filter(name => name !== '*' && !names.has(name));
      if (unknown.length) throw new SyncError(`Unknown selected skills for ${agent}: ${unknown.join(', ')}`);
      const chosen = settings.skills.includes('*') ? names : new Set(settings.skills);
      for (const name of new Set([...names, ...removed])) {
        const file = path.join(directory, name), target = path.join(this.library, name);
        inspected.add(file);
        if (settings.enabled && chosen.has(name)) desired.set(file, target);
        else if (linkTarget(file) === target) actions.push({ kind: 'unlink', path: file, target });
      }
    }
    // agent 移出配置或改路径时，只解除仍匹配所有权记录的旧链接。
    for (const [file, target] of Object.entries(owned)) {
      if (!desired.has(file) && !inspected.has(file) && linkTarget(file) === target) actions.push({ kind: 'unlink', path: file, target });
    }
    for (const [file, target] of [...desired].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
      const actual = linkTarget(file);
      if (actual === target) {
        if (owned[file] !== target) actions.push({ kind: 'adopt-link', path: file, target });
      } else if (!exists(file)) actions.push({ kind: 'link', path: file, target });
      else if (actual && (path.dirname(actual) === this.library || actual === owned[file])) actions.push({ kind: 'relink', path: file, target });
      else warnings.push(`Preserved agent override: ${file}`);
    }
    return { actions, warnings };
  }

  exclusive(operation) {
    fs.mkdirSync(this.stateDir, { recursive: true });
    const file = path.join(this.stateDir, 'running.lock');
    let descriptor;
    try { descriptor = fs.openSync(file, 'wx', 0o600); }
    catch (error) {
      if (error.code === 'EEXIST') throw new SyncError(`Another sync may be running; inspect ${file} before removing a stale lock`);
      throw error;
    }
    try { fs.writeFileSync(descriptor, String(process.pid)); return operation(); }
    finally { fs.closeSync(descriptor); fs.unlinkSync(file); }
  }

  archive(name, label) {
    const directory = path.join(this.library, name);
    if (!exists(directory)) return null;
    const backups = path.join(this.stateDir, 'backups');
    fs.mkdirSync(backups, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:.]/g, '');
    const target = path.join(backups, `${stamp}-${randomUUID().slice(0, 8)}-${name}-${label}`);
    fs.renameSync(directory, target);
    this.log(`BACKUP ${directory} -> ${target}`);
    return target;
  }

  packageOperation(names, source) {
    const before = this.lock().skills;
    const backups = new Map();
    try {
      for (const name of names) backups.set(name, this.archive(name, 'previous'));
      if (source) {
        this.cli(['add', source, '--skill', ...names, '-g', '--agent', 'codex', '-y']);
        const after = this.lock().skills;
        for (const name of names) {
          const directory = path.join(this.library, name);
          if (!isFile(path.join(directory, 'SKILL.md')) || isSymlink(directory) || sourceOf(after, name).toLowerCase() !== source.toLowerCase()) {
            throw new SyncError(`Installer did not produce the requested package/source: ${name}`);
          }
        }
      } else {
        // 先归档实体目录；只让 CLI 处理共享包记录，避免遍历其他 agent 的覆盖目录。
        const registered = names.filter(name => Object.hasOwn(before, name));
        if (registered.length) this.cli(['remove', ...registered, '-g', '--agent', 'codex', '-y']);
        for (const name of names) if (exists(path.join(this.library, name))) throw new SyncError(`Uninstall left an active shared package: ${name}`);
      }
    } catch (error) {
      for (const [name, backup] of backups) {
        this.archive(name, 'failed');
        if (backup) fs.renameSync(backup, path.join(this.library, name));
      }
      const current = this.lock();
      for (const name of names) {
        if (Object.hasOwn(before, name)) current.skills[name] = before[name];
        else delete current.skills[name];
      }
      writeJson(this.lockPath, current);
      throw error;
    }
    for (const name of names) {
      if (source) this.state.skills[name] = source;
      else delete this.state.skills[name];
    }
    writeJson(this.statePath, this.state);
  }

  applyLinks(actions) {
    for (const { kind, path: file, target } of actions) {
      if (kind === 'unlink') {
        if (linkTarget(file) !== target) throw new SyncError(`Link changed after planning: ${file}`);
        fs.unlinkSync(file);
        delete this.state.links[file];
      } else {
        if (kind === 'relink') {
          const actual = linkTarget(file);
          if (!actual || (path.dirname(actual) !== this.library && actual !== this.state.links[file])) throw new SyncError(`Link changed after planning: ${file}`);
          fs.unlinkSync(file);
        }
        if (kind === 'adopt-link') {
          if (linkTarget(file) !== target) throw new SyncError(`Link changed after planning: ${file}`);
        } else {
          if (exists(file)) throw new SyncError(`Destination changed after planning: ${file}`);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          try { fs.symlinkSync(path.relative(path.dirname(file), target), file, 'dir'); }
          catch (error) { throw new SyncError(`Cannot create symlink ${file}; on Windows enable Developer Mode or use an elevated terminal: ${error.message}`); }
        }
        this.state.links[file] = target;
      }
      writeJson(this.statePath, this.state);
    }
  }

  sync({ update = false } = {}) {
    return this.exclusive(() => {
      // 获取锁后重读状态，避免使用另一进程同步之前的旧记录。
      this.state = readJson(this.statePath, initialState());
      this.validateState();
      const plan = this.plan({ update });
      if (!exists(this.library)) {
        fs.mkdirSync(path.dirname(this.library), { recursive: true });
        fs.mkdirSync(this.localLibrary, { recursive: true });
        fs.symlinkSync(this.localLibrary, this.library, 'dir');
      }
      for (const name of plan.adopt) this.state.skills[name] = this.skills[name];
      writeJson(this.statePath, this.state);
      const grouped = new Map();
      for (const name of plan.install) {
        const source = this.skills[name];
        if (!grouped.has(source)) grouped.set(source, []);
        grouped.get(source).push(name);
      }
      // 所有下载和安装成功后，才处理移出白名单的包。
      for (const [source, names] of grouped) {
        this.log(`INSTALL ${source}: ${names.join(', ')}`);
        this.packageOperation(names, source);
      }
      const removalLinks = plan.links.filter(item => item.kind === 'unlink' && plan.remove.includes(path.basename(item.target)));
      const oldLinks = new Map(removalLinks.map(item => [item.path, fs.readlinkSync(item.path)]));
      try {
        this.applyLinks(removalLinks);
        for (const name of plan.remove) {
          this.log(`UNINSTALL ${name}`);
          this.packageOperation([name], null);
        }
      } catch (error) {
        for (const item of removalLinks) {
          if (isFile(path.join(item.target, 'SKILL.md')) && !exists(item.path)) {
            fs.symlinkSync(oldLinks.get(item.path), item.path, 'dir');
            this.state.links[item.path] = item.target;
          }
        }
        writeJson(this.statePath, this.state);
        throw error;
      }
      this.applyLinks(this.linkPlan(new Set([...Object.keys(this.skills), ...plan.local]), new Set()).actions);
      // 用户已替换为覆盖目录或外部链接时，放弃这些入口的所有权。
      this.state.links = Object.fromEntries(Object.entries(this.state.links).filter(([file, target]) => linkTarget(file) === target));
      writeJson(this.statePath, this.state);
      return this.plan();
    });
  }
}

export function printPlan(plan) {
  for (const kind of ['install', 'adopt', 'remove']) for (const name of plan[kind]) console.log(`${kind.toUpperCase().padEnd(12)} ${name}`);
  for (const action of plan.links) if (action.kind !== 'adopt-link') console.log(`${action.kind.toUpperCase().padEnd(12)} ${action.path} -> ${action.target}`);
  for (const warning of plan.warnings) console.log(`NOTICE       ${warning}`);
  if (plan.extras.length) console.log(`UNMANAGED    ${plan.extras.join(', ')}`);
  const counts = ['install', 'adopt', 'remove', 'local'].map(key => `${key}=${plan[key].length}`);
  counts.push(`links=${plan.links.filter(item => item.kind !== 'adopt-link').length}`);
  console.log(`PLAN         ${counts.join(' ')}`);
}

function main() {
  try {
    const { values, positionals } = parseArgs({ options: { config: { type: 'string' }, help: { type: 'boolean', short: 'h' } }, allowPositionals: true });
    if (values.help) { console.log('Usage: node scripts/skill-sync/sync.mjs [plan|sync|update] [--config skills.yaml]'); return; }
    const command = positionals[0] ?? 'plan';
    if (positionals.length > 1 || !['plan', 'sync', 'update'].includes(command)) throw new SyncError(`Unknown command: ${positionals.join(' ')}`);
    const repo = fileURLToPath(new URL('../../', import.meta.url));
    const manager = new SkillSync(repo, values.config ? path.resolve(values.config) : path.join(repo, 'skills.yaml'));
    printPlan(manager.plan({ update: command === 'update' }));
    if (command !== 'plan') {
      const result = manager.sync({ update: command === 'update' });
      console.log('\nAfter sync:');
      printPlan(result);
      if (result.install.length || result.adopt.length || result.remove.length || result.links.length) throw new SyncError('Sync did not converge; inspect the plan above');
    }
  } catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

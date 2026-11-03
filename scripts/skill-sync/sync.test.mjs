// 在隔离目录验证安装、卸载、失败恢复与链接所有权，绝不调用全局 skills CLI。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import spawn from 'cross-spawn';
import { stringify } from 'yaml';
import { SkillSync, SyncError, exists, githubSource, linkTarget, readJson, writeJson } from './sync.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-sync-test-'));
  t.after(() => {
    // root 仅由本测试新建；先确认边界并枚举条目，再清理本轮生成的测试输出。
    assert.notEqual(fs.realpathSync(root), fs.realpathSync(process.cwd()));
    assert.equal(path.dirname(root), os.tmpdir());
    fs.readdirSync(root, { recursive: true });
    fs.rmSync(root, { recursive: true });
  });
  const repo = path.join(root, 'repo'), home = path.join(root, 'user');
  const library = path.join(home, '.agents/skills');
  const config = path.join(repo, 'skills.yaml');
  const calls = [];
  fs.mkdirSync(path.join(repo, 'skills'), { recursive: true });
  fs.mkdirSync(path.dirname(library), { recursive: true });
  fs.symlinkSync(path.join(repo, 'skills'), library, 'dir');
  const git = args => {
    const result = spawn.sync('git', args, { cwd: repo, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  git(['init', '-q']);
  const lockPath = path.join(home, '.agents/.skill-lock.json');
  function pkg(name, { source, tracked = false } = {}) {
    const directory = path.join(repo, 'skills', name);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'SKILL.md'), `---\nname: ${name}\ndescription: A fixture\n---\nOriginal\n`);
    if (tracked) git(['add', '--', `skills/${name}/SKILL.md`]);
    if (source) {
      const lock = readJson(lockPath, { version: 3, skills: {} });
      lock.skills[name] = { source, sourceType: 'github', skillFolderHash: 'fixture' };
      writeJson(lockPath, lock);
    }
    return directory;
  }
  function configure({ names = ['remote-one'], source = 'example/skills', agentPath = '~/.claude/skills', enabled = true, selection } = {}) {
    const agent = { path: agentPath, enabled };
    if (selection !== undefined) agent.skills = selection;
    fs.writeFileSync(config, stringify({ agents: { 'claude-code': agent }, repositories: names.length ? { [`https://github.com/${source}`]: names } : {} }));
  }
  function cli(args) {
    calls.push(args);
    if (args[0] === 'add') {
      for (const name of args.slice(args.indexOf('--skill') + 1, args.indexOf('-g'))) pkg(name, { source: args[1] });
    } else if (args[0] === 'remove') {
      const lock = readJson(lockPath, { version: 3, skills: {} });
      for (const name of args.slice(1, args.indexOf('-g'))) {
        assert.equal(exists(path.join(library, name)), false, 'Archive the package before invoking remove');
        delete lock.skills[name];
      }
      writeJson(lockPath, lock);
    }
  }
  const manager = (runner = cli) => new SkillSync(repo, config, { home, cli: runner, log() {} });
  const sync = (runner, options) => manager(runner).sync(options);
  pkg('my-local', { tracked: true });
  configure();
  return { root, repo, home, library, config, lockPath, calls, pkg, configure, cli, manager, sync };
}

test('收编已有包，预览只读，重复同步收敛且不重新安装', t => {
  const f = fixture(t);
  f.pkg('remote-one', { source: 'example/skills' });
  assert.deepEqual(f.manager().plan().adopt, ['remote-one']);
  assert.equal(exists(path.join(f.repo, '.local')), false);
  f.sync();
  assert.deepEqual(f.calls, []);
  assert.equal(linkTarget(path.join(f.home, '.claude/skills/remote-one')), path.join(f.library, 'remote-one'));
  assert.equal(fs.lstatSync(path.join(f.home, '.claude/skills/my-local')).isSymbolicLink(), true);
  const result = f.sync();
  for (const key of ['install', 'remove', 'links', 'adopt']) assert.deepEqual(result[key], []);
});

test('只安装指定缺失技能，保留未管理的额外安装', t => {
  const f = fixture(t);
  f.pkg('extra', { source: 'other/skills' });
  f.sync();
  assert.deepEqual(f.calls, [['add', 'example/skills', '--skill', 'remote-one', '-g', '--agent', 'codex', '-y']]);
  assert.deepEqual(f.manager().plan().extras, ['extra']);
  assert.equal(exists(path.join(f.home, '.claude/skills/extra')), false);
});

test('卸载归档本地改动，保留未管理包和自研技能', t => {
  const f = fixture(t);
  f.pkg('remote-one', { source: 'example/skills' });
  const extra = f.pkg('extra');
  f.sync();
  fs.writeFileSync(path.join(f.library, 'remote-one/notes.txt'), 'Keep my local changes');
  f.configure({ names: [] });
  const result = f.sync();
  assert.equal(exists(path.join(f.library, 'remote-one')), false);
  assert.equal(exists(path.join(f.home, '.claude/skills/remote-one')), false);
  assert.equal(exists(extra), true);
  assert.equal(exists(path.join(f.library, 'my-local/SKILL.md')), true);
  const backups = path.join(f.repo, '.local/skill-sync/backups');
  assert.deepEqual(fs.readdirSync(backups).map(name => fs.readFileSync(path.join(backups, name, 'notes.txt'), 'utf8')), ['Keep my local changes']);
  assert.deepEqual(result.remove, []);
});

test('更新失败恢复旧目录和来源记录，同时保留其他包的来源变化', t => {
  const f = fixture(t);
  f.sync();
  fs.writeFileSync(path.join(f.library, 'remote-one/notes.txt'), 'Keep this');
  const before = readJson(f.lockPath, {});
  assert.throws(() => f.sync(() => {
    f.pkg('remote-one', { source: 'wrong/source' });
    f.pkg('extra', { source: 'other/skills' });
    throw new SyncError('Network failure');
  }, { update: true }), /Network failure/);
  assert.equal(fs.readFileSync(path.join(f.library, 'remote-one/notes.txt'), 'utf8'), 'Keep this');
  assert.deepEqual(readJson(f.lockPath, {}).skills['remote-one'], before.skills['remote-one']);
  assert.equal(readJson(f.lockPath, {}).skills.extra.source, 'other/skills');
  assert.equal(exists(path.join(f.home, '.claude/skills/remote-one/SKILL.md')), true);
});

test('更换仓库后从声明来源重新安装', t => {
  const f = fixture(t);
  f.sync();
  f.configure({ source: 'new/skills' });
  f.sync();
  assert.equal(f.manager().state.skills['remote-one'], 'new/skills');
  assert.equal(f.calls.at(-1)[1], 'new/skills');
  assert.deepEqual(f.manager().plan().install, []);
});

test('CLI 返回成功却未生成指定包时，判定失败并恢复更新', t => {
  const f = fixture(t);
  f.sync();
  assert.throws(() => f.sync(() => {}, { update: true }), /did not produce/);
  assert.equal(exists(path.join(f.library, 'remote-one/SKILL.md')), true);
  assert.equal(exists(path.join(f.home, '.claude/skills/remote-one/SKILL.md')), true);
});

test('卸载失败恢复包和 agent 链接', t => {
  const f = fixture(t);
  f.sync();
  f.configure({ names: [] });
  assert.throws(() => f.sync(() => { throw new SyncError('Uninstall failure'); }), /Uninstall failure/);
  assert.equal(exists(path.join(f.library, 'remote-one/SKILL.md')), true);
  assert.equal(exists(path.join(f.home, '.claude/skills/remote-one/SKILL.md')), true);
  assert.deepEqual(f.manager().plan().remove, ['remote-one']);
});

test('新包安装失败时延后卸载现有包', t => {
  const f = fixture(t);
  f.sync();
  f.configure({ names: ['remote-two'] });
  assert.throws(() => f.sync(() => { throw new SyncError('Install failure'); }), /Install failure/);
  assert.equal(exists(path.join(f.library, 'remote-one/SKILL.md')), true);
  assert.equal(exists(path.join(f.home, '.claude/skills/remote-one/SKILL.md')), true);
});

test('关闭软链接维护不会禁用共享目录发现', t => {
  const f = fixture(t);
  f.configure({ agentPath: '~/.agents/skills', enabled: false });
  const result = f.sync();
  assert.equal(exists(path.join(f.library, 'remote-one/SKILL.md')), true);
  assert.equal(result.warnings.some(text => text.includes('discovery remains active')), true);
});

test('缩小选择范围只移除 agent 链接，保留共享包', t => {
  const f = fixture(t);
  f.sync();
  f.configure({ selection: ['my-local'] });
  f.sync();
  assert.equal(exists(path.join(f.home, '.claude/skills/my-local')), true);
  assert.equal(exists(path.join(f.home, '.claude/skills/remote-one')), false);
  assert.equal(exists(path.join(f.library, 'remote-one/SKILL.md')), true);
});

test('保留 agent 自有目录和外部悬空软链接', t => {
  const f = fixture(t);
  f.pkg('remote-one', { source: 'example/skills' });
  const agent = path.join(f.home, '.claude/skills');
  fs.mkdirSync(path.join(agent, 'remote-one'), { recursive: true });
  fs.writeFileSync(path.join(agent, 'remote-one/custom.txt'), 'Agent-owned');
  fs.symlinkSync(path.join(f.root, 'external'), path.join(agent, 'my-local'), 'dir');
  const result = f.sync();
  assert.equal(fs.readFileSync(path.join(agent, 'remote-one/custom.txt'), 'utf8'), 'Agent-owned');
  assert.equal(linkTarget(path.join(agent, 'my-local')), path.join(f.root, 'external'));
  assert.equal(result.warnings.length, 2);
});

test('修改路径、关闭或移出 agent，只移除已管理链接', t => {
  const f = fixture(t);
  f.sync();
  const old = path.join(f.home, '.claude/skills');
  fs.mkdirSync(path.join(old, 'agent-owned'));
  f.configure({ agentPath: '~/.custom/skills' });
  f.sync();
  assert.equal(exists(path.join(old, 'remote-one')), false);
  assert.equal(exists(path.join(old, 'agent-owned')), true);
  const target = path.join(f.home, '.custom/skills/remote-one');
  assert.equal(exists(target), true);
  f.configure({ agentPath: '~/.custom/skills', enabled: false });
  f.sync();
  assert.equal(exists(target), false);
  f.configure();
  f.sync();
  fs.writeFileSync(f.config, stringify({ agents: {}, repositories: { 'https://github.com/example/skills': ['remote-one'] } }));
  f.sync();
  assert.equal(exists(path.join(old, 'remote-one')), false);
  assert.equal(exists(path.join(old, 'agent-owned')), true);
});

test('修复指向共享库内部错误目标的链接', t => {
  const f = fixture(t);
  f.pkg('remote-one', { source: 'example/skills' });
  const agent = path.join(f.home, '.claude/skills');
  fs.mkdirSync(agent, { recursive: true });
  fs.symlinkSync(path.join(f.library, 'missing'), path.join(agent, 'remote-one'), 'dir');
  f.sync();
  assert.equal(linkTarget(path.join(agent, 'remote-one')), path.join(f.library, 'remote-one'));
});

test('拒绝覆盖来源不匹配的同名未管理包', t => {
  const f = fixture(t);
  f.pkg('remote-one', { source: 'other/source' });
  assert.throws(() => f.manager().plan(), /Unmanaged or replaced/);
  assert.deepEqual(f.calls, []);
});

test('拒绝路径穿越、未知字段和错误的配置类型', t => {
  const f = fixture(t);
  f.configure({ names: ['../escape'] });
  assert.throws(() => f.manager(), /Invalid skill/);
  f.configure();
  fs.writeFileSync(f.config, fs.readFileSync(f.config, 'utf8').replace('enabled:', 'enabeld:'));
  assert.throws(() => f.manager(), /Unknown agent/);
  for (const value of ['', '{}', 'agents: []\nrepositories: {}', 'agents: {}\nrepositories: []',
    'agents: {codex: {enabled: null}}\nrepositories: {}',
    'agents: {codex: {path: null}}\nrepositories: {}',
    'agents: {codex: {skills: null}}\nrepositories: {}',
    'agents: {codex: {enabled: true}}\nrepositories: {}',
    'agents: {codex: true}\nrepositories: {}',
    'local: {include_tracked: null}\nagents: {}\nrepositories: {}']) {
    fs.writeFileSync(f.config, value);
    assert.throws(() => f.manager(), SyncError);
  }
});

test('本机 TOML 覆盖可修改 agent 路径与技能子集', t => {
  const f = fixture(t);
  const local = path.join(f.home, '.config/my-skills/config.toml');
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, '[skill-sync.agents.claude-code]\npath = "~/.alternate/skills"\nskills = ["my-local"]\n');
  fs.writeFileSync(f.config, stringify({ agents: { 'claude-code': '~/.claude/skills' }, repositories: { 'https://github.com/example/skills': ['remote-one'] } }));
  f.sync();
  assert.equal(exists(path.join(f.home, '.alternate/skills/my-local')), true);
  assert.equal(exists(path.join(f.home, '.alternate/skills/remote-one')), false);
});

test('路径简写与展开配置支持技能子集和新增 agent', t => {
  const f = fixture(t);
  fs.writeFileSync(f.config, stringify({ agents: {
    'claude-code': '~/.claude/skills',
    codex: { path: '~/.codex/skills', enabled: false },
    'oh-my-pi': { path: '~/.omp/agent/skills', skills: ['my-local'] },
    custom: '~/.custom/skills',
  }, repositories: { 'https://github.com/example/skills.git/': ['remote-one'] } }));
  f.sync();
  assert.equal(exists(path.join(f.home, '.claude/skills/remote-one')), true);
  assert.equal(exists(path.join(f.home, '.codex/skills/remote-one')), false);
  assert.equal(exists(path.join(f.home, '.omp/agent/skills/my-local')), true);
  assert.equal(exists(path.join(f.home, '.omp/agent/skills/remote-one')), false);
  assert.equal(exists(path.join(f.home, '.custom/skills/my-local')), true);
  assert.equal(exists(path.join(f.home, '.custom/skills/remote-one')), true);
  f.configure({ selection: [] });
  f.sync();
  assert.equal(exists(path.join(f.home, '.claude/skills/my-local')), false);
  assert.equal(exists(path.join(f.library, 'my-local/SKILL.md')), true);
  assert.equal(f.manager().state.skills['remote-one'], 'example/skills');
});

test('规范化完整 GitHub URL，拒绝非仓库地址', () => {
  for (const suffix of ['', '/', '.git', '.git/']) assert.equal(githubSource(`https://github.com/Example/Skills${suffix}`), 'Example/Skills');
  for (const value of ['example/skills', 'http://github.com/a/b', 'https://example.com/a/b', 'https://user@github.com/a/b',
    'https://github.com/a/b/tree/main', 'https://github.com/a/b?ref=main', 'https://github.com/a/b#readme',
    'https://github.com/a/../b', 'https://github.com/../b', 'https://github.com/a/%62']) {
    assert.throws(() => githubSource(value), SyncError, value);
  }
});

test('拒绝 YAML 重复键、规范化后重复仓库与跨仓库同名技能', t => {
  const f = fixture(t);
  for (const text of [
    'agents: {}\nagents: {}\nrepositories: {}',
    'agents: {}\nrepositories:\n  https://github.com/a/b: [one]\n  https://github.com/A/B.git/: [two]',
    'agents: {}\nrepositories:\n  https://github.com/a/b: [one]\n  https://github.com/c/d: [one]',
  ]) {
    fs.writeFileSync(f.config, text);
    assert.throws(() => f.manager(), /[Dd]uplicate|unique/);
  }
});

test('已有进程锁阻止同步，预览仍可运行', t => {
  const f = fixture(t);
  const lock = path.join(f.repo, '.local/skill-sync/running.lock');
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  fs.writeFileSync(lock, 'fixture');
  assert.deepEqual(f.manager().plan().install, ['remote-one']);
  assert.throws(() => f.sync(), /Another sync/);
  assert.equal(fs.readFileSync(lock, 'utf8'), 'fixture');
});

test('拒绝未注入 CLI 的自定义 home，防止测试调用真实全局安装', t => {
  const f = fixture(t);
  assert.throws(() => new SkillSync(f.repo, f.config, { home: f.home }), /custom home requires/);
});

import { test } from 'vitest';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalReader } from '../../scripts/lib/git-canonical.mjs';

test('Git canonical bytes survive CRLF, staging and content corruption without rewriting files', () => {
 const cwd = mkdtempSync(join(tmpdir(), 'r4-canonical-test-'));
 const git = (...args: string[]) => execFileSync('git', ['-c', `safe.directory=${cwd}`, ...args], {cwd});
 git('init', '--quiet');
 git('config', 'core.autocrlf', 'true');
 writeFileSync(join(cwd, '.gitattributes'), '*.bin -text\n');
 const canonical = canonicalReader(cwd);
 const original = Buffer.from('SELECT 1;\n-- historical\n');
 writeFileSync(join(cwd, 'migration.sql'), original);
 assert.deepEqual(canonical('migration.sql'), original); // untracked LF snapshot
 const windows = Buffer.from('SELECT 1;\r\n-- historical\r\n');
 writeFileSync(join(cwd, 'migration.sql'), windows);
 assert.deepEqual(canonical('migration.sql'), original); // untracked CRLF
 git('add', 'migration.sql', '.gitattributes');
 assert.deepEqual(canonical('migration.sql'), original); // newly tracked/staged
 assert.deepEqual(readFileSync(join(cwd, 'migration.sql')), windows);
 assert.deepEqual(git('show', ':migration.sql'), original);
 writeFileSync(join(cwd, 'migration.sql'), 'SELECT 2;\r\n-- historical\r\n');
 assert.notDeepEqual(canonical('migration.sql'), original); // real corruption is retained
 writeFileSync(join(cwd, 'fixture.bin'), windows);
 assert.deepEqual(canonical('fixture.bin'), windows); // binary attributes respected
 git('config', 'core.autocrlf', 'false');
 assert.deepEqual(canonical('migration.sql'), readFileSync(join(cwd, 'migration.sql')));
});

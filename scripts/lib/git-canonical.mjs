import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Ask Git to apply the path's clean rules (including autocrlf and attributes).
// Objects live only in system temp: neither index nor repository objects are written.
export function canonicalReader(cwd = process.cwd()) {
 const objectDirectory = mkdtempSync(join(tmpdir(), 'r4-canonical-'));
 const env = { ...process.env, GIT_OBJECT_DIRECTORY: objectDirectory };
 const git = (args, input) => execFileSync('git', ['-c', `safe.directory=${cwd}`, ...args], { cwd, env, input, maxBuffer: 32 * 1024 * 1024 });
 return path => {
  const oid = git(['hash-object', '-w', `--path=${path}`, '--stdin'], readFileSync(join(cwd, path))).toString().trim();
  return git(['cat-file', 'blob', oid]);
 };
}

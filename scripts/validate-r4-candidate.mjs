/** Read-only checks by default. --write refreshes the review inventory/evidence. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { canonicalReader } from './lib/git-canonical.mjs';
const canonical = canonicalReader();
const suppliedTransport = 'c6908f57a9579d581c36f9b5bfd7eaf4e402c77d';
const base = '8bbf9228a7b59602297f3d53697e1ca4a23b66dd';
const git = (...args) => execFileSync('git', ['-c', `safe.directory=${process.cwd()}`, ...args]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const paths = bytes => bytes.toString().trim().split('\n').filter(Boolean);
const baselinePaths = paths(git('ls-tree', '-r', '--name-only', base));
const trackedPaths = paths(git('ls-files'));
const addedPaths = paths(git('ls-files', '--others', '--exclude-standard'));
const changedPaths = [...new Set([...paths(git('diff', '--name-only', base)), ...addedPaths])].sort();
const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json'));
const oldJournal = JSON.parse(git('show', `${base}:drizzle/meta/_journal.json`));
assert.deepEqual(journal.entries.slice(0, oldJournal.entries.length), oldJournal.entries);
assert.equal(journal.entries.length, 14);
assert.deepEqual(journal.entries.map(e => e.idx), [...Array(14).keys()]);
assert(journal.entries.every((e, i, es) => i === 0 || e.when > es[i - 1].when));
const historicalFiles = baselinePaths.filter(p => p.startsWith('drizzle/') && p !== 'drizzle/meta/_journal.json');
for (const path of historicalFiles) assert(canonical(path).equals(git('show', `${base}:${path}`)), `Historical migration/snapshot changed: ${path}`);
for (const [archived, original] of [['evaluation_adapter.r3.json', 'evaluation_adapter.json'], ['release_submission.r3.md', 'release_submission.md']]) {
 assert(canonical(`docs/archive/r4-preparation/${archived}`).equals(git('show', `${base}:${original}`)), `R3 archive mismatch: ${archived}`);
}
const supplied = canonical('docs/archive/r4-validation/changed-files.supplied.txt').toString('utf8').split('\n').filter(l => /^[AM] (?:[a-f0-9]{64}|SELF) /.test(l));
let transportAvailable = true;
try { execFileSync('git', ['-c', `safe.directory=${process.cwd()}`, 'cat-file', '-e', suppliedTransport], {stdio: 'ignore'}); } catch { transportAvailable = false; }
for (const line of transportAvailable ? supplied : []) {
 const [, digest, path] = line.split(' ');
 const original = git('show', `${suppliedTransport}:${path}`);
 if (digest !== 'SELF') assert.equal(hash(original), digest, `Supplied manifest mismatch: ${path}`);
 if (path.endsWith('.json')) JSON.parse(original);
}
assert.equal(supplied.length, 50);
// Executable candidate identity deliberately excludes reports/inventory to avoid recursive hashes.
const candidatePaths = [...new Set([...trackedPaths, ...addedPaths])].filter(p => /^(src\/|tests\/|scripts\/|drizzle\/|public\/|package(?:-lock)?\.json$|(?:next|drizzle|playwright|vitest)\.config\.|eslint\.config\.|tsconfig\.json$)/.test(p)).sort();
const candidateRows = candidatePaths.map(path => `${hash(canonical(path))}  ${path}`);
const evidence = {
 baseline: base, transportHead: suppliedTransport,
 hashBasis: 'Git clean canonical bytes, using path attributes and checkout configuration; SHA-256',
 scope: 'Executable source/configuration/tests/fixtures, excluding documentation and this evidence to avoid recursive hashing',
 candidateFingerprint: hash(Buffer.from(candidateRows.join('\n') + '\n')), candidateFileCount: candidateRows.length,
 suppliedInventoryVerifiedFiles: transportAvailable ? supplied.length : null, historicalMigrationAndSnapshotFilesUnchanged: historicalFiles.length,
 historicalJournalEntriesUnchanged: oldJournal.entries.length,
 migrationHashBasis: 'canonicalSha256 identifies committed content; rawMigratorSha256 hashes checkout bytes read by Drizzle and may differ on CRLF checkouts. Historical files and ledger hashes are never rewritten.',
 migrationJournal: journal.entries.map(e => ({ ...e, canonicalSha256: hash(canonical(`drizzle/${e.tag}.sql`)), rawMigratorSha256: hash(readFileSync(`drizzle/${e.tag}.sql`)) })),
 candidateFiles: candidateRows,
};
const manifest = ['R4 complete changed-file manifest', `Real baseline: ${base}; transport HEAD is a supplied snapshot.`,
 'M = modified baseline file; A = added file. SHA-256 covers Git clean canonical bytes (path attributes and checkout configuration).',
 'Inventory includes itself without a recursive self-hash. Original inventory is archived.', '',
 ...changedPaths.map(path => `${baselinePaths.includes(path) ? 'M' : 'A'} ${path === 'docs/course/r4/changed-files.txt' ? 'SELF' : hash(canonical(path))} ${path}`), ''].join('\n');
if (process.argv.includes('--write')) {
 writeFileSync('docs/course/r4/validation-evidence/candidate.json', JSON.stringify(evidence, null, 2) + '\n');
 // candidate.json may be new during this invocation; regenerate inventory on the next invocation.
 writeFileSync('docs/course/r4/changed-files.txt', manifest);
} else {
 assert.equal(canonical('docs/course/r4/changed-files.txt').toString('utf8'), manifest, 'Inventory stale: run node scripts/validate-r4-candidate.mjs --write');
 assert.equal(JSON.parse(readFileSync('docs/course/r4/validation-evidence/candidate.json')).candidateFingerprint, evidence.candidateFingerprint);
}
console.log(JSON.stringify({ ...evidence, candidateFiles: undefined, changedFileCount: changedPaths.length }, null, 2));

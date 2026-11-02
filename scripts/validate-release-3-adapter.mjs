import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// Read-only documentation contract check. This does not validate a Moodle R3
// schema: that template is absent and the extension must remain provisional.
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const adapter = read('evaluation_adapter.json');
const previous = read('docs/evaluation-adapter-before-r3.json');
const r1 = read('evaluation_adapter_r1_template.json');
for (const [key, value] of Object.entries(previous)) {
  assert.deepEqual(adapter[key], value, `Existing R1/R2 contract changed: ${key}`);
}
for (const key of Object.keys(r1)) {
  assert.equal(typeof adapter[key], typeof r1[key], `R1 field type: ${key}`);
}
const r3 = adapter.release_3;
assert.equal(r3.adapter_status, 'PROVISIONAL_OFFICIAL_R3_TEMPLATE_MISSING');
assert.equal(r3.required_official_template, 'evaluation_adapter_template.json');
assert.equal(r3.planned_release_tag, 'R3-submission');
assert.ok(existsSync(r3.contract_document));
assert.equal(Object.keys(r3.pages).length, 9);
assert.equal(Object.keys(r3.apis).length, 18);
function sourcePath(route, leaf) {
  assert.match(route, /^\/[A-Za-z0-9/{\}_-]+$/);
  assert.ok(!route.includes('..'));
  return `src/app${route.replace(/\{([A-Za-z]+)\}/g, '[$1]')}/${leaf}`;
}
for (const route of Object.values(r3.pages)) {
  assert.ok(existsSync(sourcePath(route, 'page.tsx')), `Missing page: ${route}`);
}
for (const endpoint of Object.values(r3.apis)) {
  const file = sourcePath(endpoint.path, 'route.ts');
  assert.ok(existsSync(file), `Missing API: ${endpoint.path}`);
  const source = readFileSync(file, 'utf8');
  assert.ok(endpoint.methods.length > 0);
  for (const method of endpoint.methods) {
    assert.ok(['GET', 'POST', 'PATCH'].includes(method));
    assert.match(source, new RegExp(`export (?:const |(?:async )?function )${method}\\b`));
  }
}
for (const workflow of Object.values(r3.workflows)) {
  if (workflow.entry) assert.ok(Object.hasOwn(r3.pages, workflow.entry));
  for (const field of ['api', 'offer_api', 'response_api']) {
    if (workflow[field]) assert.ok(Object.hasOwn(r3.apis, workflow[field]));
  }
}
assert.equal(r3.workflows.contributor_roles.count, 12);
assert.equal(read(r3.workflows.contributor_roles.fixture).length, 12);
assert.equal(read(r3.workflows.duplicate_warning.fixture).length, 3);
for (const [workflow, original] of [
  ['playable_demo', 'working_demo.html'], ['fallback', 'fallback.svg'],
]) {
  const route = r3.workflows[workflow].fixture_path;
  assert.deepEqual(readFileSync(`public${route}`), readFileSync(`Release 3 Fixtures-20261030/${original}`));
}
assert.equal(r3.authorization.shared_editors, 'maintainer_only');
assert.equal(r3.authorization.removal, 'maintainer_reversible_soft_removal');
assert.equal(r3.production_evidence.status, 'NOT_ESTABLISHED');
for (const key of ['deployment_url', 'deployed_commit', 'assessed_commit', 'release_tag', 'shared_project_url', 'playable_url', 'fallback_url', 'public_import_repository_url']) {
  assert.equal(r3.production_evidence[key], null, `Unverified release evidence: ${key}`);
}
assert.deepEqual(r3.production_evidence.contributor_profile_urls, []);
for (const field of ['setup_guide', 'results', 'traceability']) assert.ok(existsSync(r3.qa[field]));
console.log('Adapter JSON and provisional team contract valid: R1/R2 preserved; 9 pages, 18 APIs/methods and fixture copies verified; no invented production evidence.');
console.log('RELEASE GATE: latest official R3 adapter template is missing; this is not official schema validation.');

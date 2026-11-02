# Release 3 Phase 1 disposable PostgreSQL verification

Date: October 30, 2026 (America/Toronto). Branch: `feat/release-3`.
HEAD remains `4c8a64d7313c1401889ae97a1223090d059008de` with uncommitted Phase 1 repair.
Author configuration remains Jash Sojitra <jash221434@gmail.com>.

## Recommendation

Approve the UUID self-service student inquiry repair for Phase 1 review and proceed to R3 feature planning/implementation after review authorization. Required fresh/upgrade migrations, inquiry/API regressions, and actual desktop/390px submission journeys passed. No deployment readiness or production verification is claimed.

## Isolation and database identity

Docker Desktop Linux engine was available (engine 29.9.2, context `desktop-linux`, WSL2 kernel); initial container inventory was empty. Sandbox engine access was denied, so Docker commands ran with approved engine access. No development/Supabase/production connection was opened. `.env.local` was not changed.

Two new disposable containers were created, never reused:

| Attempt | Container name / ID | Binding | Outcome |
| --- | --- | --- | --- |
| 1 | `immx-phase1-5192de4bb58c` / `564f1417dc9bd8f15bfb23b23c2b25ce9520326ed30437df83d70f2a4a81368b` | `127.0.0.1:54741` -> container 5432 | Migrations/upgrade passed; one test assertion failed; removed |
| 2 | `immx-phase1-a9c24683971f` / `38ac786d4b27f843e3bdd0286cd0920d86450141426286b4281d86653df395d5` | `127.0.0.1:61365` -> container 5432 | Complete verification passed; removed |

Image: `postgres:18`, resolved image ID `sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4`. Server reported PostgreSQL 18.6, Debian 18.6-1.pgdg13+2, x86_64 Linux. Passwords were independently generated from 32 random bytes per attempt, passed through process environment, never printed or saved. PostgreSQL data was on a container tmpfs, not a host or existing database volume.

Second-attempt database names: `phase1_a9c24683971f_fresh`, `phase1_a9c24683971f_upgrade`, `phase1_a9c24683971f_guard`. The first attempt used its own corresponding names. Guard database was a distinct disposable container database for the existing test-isolation checks; it was not normal development.

Before migration, fixture insertion, or each test subprocess, verification asserted exact container ID, run label, unique localhost port binding, `current_database()`, `current_user`, server port 5432, and `current_setting('cluster_name')`. Cluster name matched `immx-phase1-a9c24683971f` in the successful attempt. Only after identity confirmation were the fresh guard/upgrade databases and local fixture roles created.

Every subprocess explicitly overrode `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `DEVELOPMENT_DATABASE_URL`, and `TEST_DATABASE_URL` to those container databases. Existing Playwright configuration intentionally passes the test URL to the application server and the distinct guard URL to its isolation check. OAuth/email variables were dummy test values; no real provider sign-in or delivery was used. PostgreSQL fixture roles `postgres`, `anon`, and `authenticated` were NOLOGIN roles required by historical hardening migration 0007.

## Migration and upgrade results

| Check | Actual result |
| --- | --- |
| Fresh sequence 0000-0008 | Passed; nine rows in Drizzle journal |
| Pre-0008 sequence 0000-0007 | Passed on separate empty upgrade database; eight journal rows |
| Representative existing data | Legacy published student `UP-S01`, project `UP-P01`, contributor, technology, existing student inquiry, existing project inquiry |
| Apply 0008 to populated pre-0008 schema | Passed; journal advanced from eight to nine rows |
| Historical record preservation | Compared full JSON snapshots before/after, excluding only newly added nullable `student_profile_id`; identical |
| New project-only inquiry after upgrade | Insert succeeded with both student FKs null |
| Profile FK catalog check | Validated FK to `student_profiles(id)`, `ON DELETE RESTRICT` |
| Exact-one-source CHECK | Validated; integration suite exercised all 16 source-type/FK-presence combinations and mismatched IDs |
| Historical migrations | SQL hashes unchanged; no old migration/journal entry rewritten |

The pre-0008 migration folder was a temporary copy of the original 0000-0007 SQL and original journal entries. Source migrations were not edited. Applying 0008 was done through Drizzle's migrator, not by bypassing the journal.

## Test results and fixes

| Execution | Result |
| --- | --- |
| First inquiry integration attempt | 25 passed, 1 failed; clean runner exit 1 |
| Corrected inquiry integration | **26/26 passed**, one file, clean exit 0, 1.26s |
| Relevant API regressions | **63/63 passed**, four files, clean exit 0, 8.80s |
| Production build | Passed, including TypeScript; clean exit 0 |
| Desktop UUID browser journey | **Passed**, 9.1s |
| Mobile-390 UUID browser journey | **Passed**, 5.8s |
| Complete targeted Playwright run | **2/2 passed**, 27.7s, clean exit 0 |
| Final typecheck | Passed |
| Final lint | Passed |
| Final diff check | Passed; only Git line-ending normalization warnings |

API regression files: `talent-api.test.ts`, `student-profile-api.test.ts`, `project-detail-api.test.ts`, `private-student-profile.test.ts`. Total successful database integration/API cases: **89 across five files**. No selected test was skipped. This was focused Phase 1 verification, not the entire repository browser/integration matrix.

First failure: the nonexistent-profile insert correctly returned `23503`, but deletion blocked by PostgreSQL 18 `ON DELETE RESTRICT` returned `23001` (restrict violation). The test had incorrectly expected `23503` for both. Corrected only the deletion assertion to require `23001` and the exact new FK constraint name, and additionally asserted the referenced profile still exists. No production implementation or migration change was necessary.

Added explicit unverified browser coverage: after successful real form submission, temporarily remove the synthetic account's affiliation, submit the same published UUID through the real API, require 404 and no new stored inquiry, and restore the original affiliation in `finally`. Both browser viewports execute this, plus pre-publication rejection, post-unpublication rejection, real 201 submission, stored FK/source snapshot checks, success UI, UUID geometry and overflow checks.

Flow evidence:

| Boundary | Evidence |
| --- | --- |
| UI -> API | Real Submit inquiry click; awaited POST `/api/v1/inquiries`, status 201 |
| API -> database | Stored row queried directly from verified container database |
| Database -> response | Confirmation ID resolves to row with profile FK, null legacy/project FKs, trusted name/URL |
| Response -> UI | Inquiry received success state visible |
| Eligibility failure | Unpublished/unverified API responses 404; no extra inquiry inserted |

## Commands and bounded execution

Read-only preparation included `git status --short --branch`, `git config user.name`, `git config user.email`, `Get-Command docker`, `docker version --format '{{json .Server}}'`, `docker context show`, `docker ps --format '{{.Names}}'`, and inspection of the three R3/R2 documents, migration configuration, safety helpers, inquiry tests, and existing scripts. Secrets were not printed.

The temporary runner was executed twice from repository root:

```text
node --import tsx tmp/phase1-verify.mjs
```

It executed the following child commands, with container-only database environment overrides:

```text
node node_modules/vitest/vitest.mjs run tests/integration/inquiry-api.test.ts --maxWorkers=1 --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/integration/talent-api.test.ts tests/integration/student-profile-api.test.ts tests/integration/project-detail-api.test.ts tests/integration/private-student-profile.test.ts --maxWorkers=1 --reporter=verbose
node node_modules/next/dist/bin/next build
node node_modules/@playwright/test/cli.js test tests/browser/private-student-profile.spec.ts --reporter=list
```

Limits: 120 seconds per Vitest command, 180 seconds for build, 150 seconds for Playwright; timeout would terminate only the spawned command's process tree. All successful-attempt commands exited normally before their limit. Default Vitest pool with one worker did not hang. Playwright's existing npm/Next server lifecycle exited cleanly; prior teardown hang did not reproduce. No test-runner or application configuration was weakened or changed.

Final independent commands: `npm run typecheck`, `npm run lint`, `git diff --check`, historical SQL diff/hash checks, tag checks, untracked-input hashes, and `docker ps -a --filter label=immx.phase1.run --format '{{.ID}} {{.Names}} {{.Status}}'` (empty output).

## Cleanup and remaining risks

Both containers were removed with `docker rm --force --volumes <exact-created-ID>` after verifying their per-run labels. Temporary copied migration directories were removed. No existing container, volume, database, or cluster was reused/removed. The downloaded PostgreSQL Docker image remains cached; removing it could affect other work and was unnecessary. Temporary driver/log files were removed after recording the execution below. Port 3100 listener check is recorded after completion.

Final resource checks: Docker's run-label-filtered inventory was empty and no
listener remained on port 3100. The first final lint run had zero errors and one
unused-import warning in the temporary runner; the runner was then removed and
lint rerun against the final repository state.

All 14 pre-existing untracked inputs (fixtures, course PDFs, planning documents, new migration/snapshot) retained identical hashes. R1/R2 tags, branch HEAD and author configuration were preserved. No commits, pushes, deployments, tags, R3 features, historical migration changes, or Supabase/development/production operations occurred.

Remaining risks: production migration/deployment remains a separate future action; hosted provider delivery/sign-in and deployed R2 screenshots were not tested here. The focused run establishes Phase 1 behavior on PostgreSQL 18.6, not universal platform/version compatibility. Reproduce a runner hang before changing lifecycle settings. The temporary container user was an isolated superuser for historical migrations; this run does not constitute a least-privilege deployment audit.

## Exact temporary runner source

The source below records Docker flags, identity queries, role/database creation, migration calls, upgrade seed SQL, snapshot comparison, command limits, environment overrides, and cleanup. Credentials are generated at runtime and are not present in this document. The runner was removed from `tmp` after verification.

```javascript
import { randomBytes, createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';

const token = randomBytes(6).toString('hex');
const name = `immx-phase1-${token}`;
const password = randomBytes(32).toString('hex');
const user = `phase1_${token}`;
const fresh = `${user}_fresh`, upgrade = `${user}_upgrade`, guard = `${user}_guard`;
const cluster = `immx-phase1-${token}`;
const scratch = resolve('tmp', name);
mkdirSync(scratch);
const baseline = execFileSync('git', ['diff', '--binary'], {encoding:'utf8'});
const inputs = execFileSync('git', ['ls-files','--others','--exclude-standard','-z'], {encoding:'utf8'}).split('\0').filter(p=>p && !p.startsWith('tmp/'));
const hashes = Object.fromEntries(inputs.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const history = execFileSync('git',['ls-files','drizzle/*.sql'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(p=>!p.includes('0008')).map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]);
const notes = [];
const clean = s => String(s).replaceAll(password,'[REDACTED]').replace(/postgres(?:ql)?:\/\/[^\s'"\]]+/g,'[CONTAINER_DATABASE_URL]');
function log(s) { const line=clean(s); console.log(line); notes.push(line); }
function docker(args, env={}) { return execFileSync('docker',args,{encoding:'utf8',env:{...process.env,...env},timeout:30000,stdio:['ignore','pipe','pipe']}).trim(); }
let id, port, clients=[];
let environment;
const connection = database => {
  const c=postgres({host:'127.0.0.1',port:Number(port),user,password,database,max:1,connect_timeout:5,prepare:false,onnotice:()=>{}});
  clients.push(c); return c;
};
async function verify(database) {
  const meta=JSON.parse(docker(['inspect','--format','{{json .}}',id]));
  const bindings=meta.NetworkSettings.Ports['5432/tcp'];
  if(meta.Id!==id || meta.Config.Labels['immx.phase1.run']!==token || bindings.length!==1 || bindings[0].HostIp!=='127.0.0.1' || bindings[0].HostPort!==port) throw Error('Container identity or binding mismatch');
  const c=connection(database);
  try {
    const [row]=await c`select current_database() as database, current_user as username, inet_server_port() as port, current_setting('cluster_name') as cluster, version() as version`;
    if(row.database!==database || row.username!==user || row.port!==5432 || row.cluster!==cluster) throw Error('Server/database identity mismatch');
    log(`IDENTITY VERIFIED ${JSON.stringify({container:id,database:row.database,user:row.username,published:`127.0.0.1:${port}`,serverPort:row.port,cluster:row.cluster,version:row.version})}`);
  } finally { await c.end(); clients=clients.filter(x=>x!==c); }
}
async function run(label,args,timeout=120000) {
  await verify(fresh);
  log(`COMMAND ${label}: node ${args.join(' ')} [all database variables explicitly scoped to disposable container]`);
  return await new Promise(resolveRun=>{
    const child=spawn(process.execPath,args,{env:environment,stdio:['ignore','pipe','pipe'],windowsHide:true});
    let output='',timed=false;
    child.stdout.on('data',d=>{const s=clean(d); process.stdout.write(s); output+=s;});
    child.stderr.on('data',d=>{const s=clean(d); process.stdout.write(s); output+=s;});
    const timer=setTimeout(()=>{timed=true;execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});},timeout);
    child.on('exit',(code)=>{clearTimeout(timer);log(`RESULT ${label}: exit=${code}, timeout=${timed}`);notes.push(output);resolveRun({code,timed});});
  });
}
async function apply(database, folder) {
  await verify(database);
  const c=connection(database);
  try { await migrate(drizzle(c),{migrationsFolder:folder}); log(`MIGRATIONS ${database}: ${JSON.stringify(await c`select count(*)::int as applied from drizzle.__drizzle_migrations`)}`); }
  finally { await c.end();clients=clients.filter(x=>x!==c); }
}
try {
  log(`COMMAND docker run --detach --name ${name} --label immx.phase1.run=${token} --publish 127.0.0.1::5432 --tmpfs /var/lib/postgresql -e POSTGRES_USER -e POSTGRES_PASSWORD -e POSTGRES_DB postgres:18 -c cluster_name=${cluster}`);
  id=execFileSync('docker',['run','--detach','--name',name,'--label',`immx.phase1.run=${token}`,'--publish','127.0.0.1::5432','--tmpfs','/var/lib/postgresql','-e','POSTGRES_USER','-e','POSTGRES_PASSWORD','-e','POSTGRES_DB','postgres:18','-c',`cluster_name=${cluster}`],{encoding:'utf8',env:{...process.env,POSTGRES_USER:user,POSTGRES_PASSWORD:password,POSTGRES_DB:fresh},timeout:180000,stdio:['ignore','pipe','pipe']}).trim();
  port=JSON.parse(docker(['inspect','--format','{{json .NetworkSettings.Ports}}',id]))['5432/tcp'][0].HostPort;
  for(let i=0;i<40;i++) { try { docker(['exec',id,'pg_isready','-U',user,'-d',fresh]); break; } catch { if(i===39)throw Error('Container readiness timeout'); await new Promise(r=>setTimeout(r,500)); } }
  await verify(fresh);
  log(`IMAGE ${docker(['inspect','--format','{{.Image}}',id])}`);
  const c=connection(fresh);
  await c.unsafe('CREATE ROLE postgres NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;');
  await c.unsafe(`CREATE DATABASE "${upgrade}"`); await c.unsafe(`CREATE DATABASE "${guard}"`);
  await c.end(); clients=clients.filter(x=>x!==c);
  const url=db=>`postgresql://${user}:${password}@127.0.0.1:${port}/${db}`;
  environment={...process.env,DATABASE_URL:url(guard),DATABASE_MIGRATION_URL:url(guard),DEVELOPMENT_DATABASE_URL:url(guard),TEST_DATABASE_URL:url(fresh),BETTER_AUTH_URL:'http://127.0.0.1:3100',BETTER_AUTH_SECRET:randomBytes(32).toString('hex'),GITHUB_CLIENT_ID:'isolated-test-client',GITHUB_CLIENT_SECRET:'isolated-test-secret',EMAIL_PROVIDER:'gmail',GMAIL_SMTP_USER:'isolated@example.test',GMAIL_SMTP_APP_PASSWORD:'isolated-not-real',RESEND_API_KEY:'isolated-not-real',AFFILIATION_EMAIL_FROM:'isolated@example.test',IMMXRSIVE_BROWSER_TEST_RUNTIME:'1'};
  await apply(fresh,'drizzle');
  const prefix=resolve(scratch,'pre0008'); mkdirSync(resolve(prefix,'meta'),{recursive:true});
  const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8')); const old={...journal,entries:journal.entries.filter(e=>e.idx<8)};
  writeFileSync(resolve(prefix,'meta/_journal.json'),JSON.stringify(old));
  for(const e of old.entries) copyFileSync(`drizzle/${e.tag}.sql`,resolve(prefix,`${e.tag}.sql`));
  await apply(upgrade,prefix);
  await verify(upgrade);
  const u=connection(upgrade);
  await u.unsafe(`INSERT INTO students VALUES ('UP-S01','Legacy Student','Legacy headline','Computing','current','published');
    INSERT INTO projects VALUES ('UP-P01','Legacy project','Existing description','Training');
    INSERT INTO project_contributors VALUES ('UP-P01','UP-S01','XR Developer',0);
    INSERT INTO project_technologies VALUES ('UP-P01','Unity',0);
    INSERT INTO inquiries (source_type,student_id,source_id,source_name,source_url,company_name,contact_name,contact_email,description) VALUES ('student','UP-S01','UP-S01','Legacy Student','/students/UP-S01','Legacy Employer','Contact','legacy@example.test','Existing student inquiry');
    INSERT INTO inquiries (source_type,project_id,source_id,source_name,source_url,company_name,contact_name,contact_email,description) VALUES ('project','UP-P01','UP-P01','Legacy project','/projects/UP-P01','Legacy Employer','Contact','legacy@example.test','Existing project inquiry');`);
  async function snapshot() { const result={}; for(const table of ['students','projects','project_contributors','project_technologies','inquiries']) result[table]=await u.unsafe(`select to_jsonb(t)-'student_profile_id' as row from ${table} t order by to_jsonb(t)::text`); return JSON.stringify(result); }
  const before=await snapshot();
  await apply(upgrade,'drizzle');
  if(await snapshot()!==before) throw Error('Upgrade changed historical records');
  log('UPGRADE PASSED: legacy student, project, contributor, technology, and both existing inquiry snapshots unchanged');
  await u.unsafe(`INSERT INTO inquiries (source_type,project_id,source_id,source_name,source_url,company_name,contact_name,contact_email,description) VALUES ('project','UP-P01','UP-P01','Legacy project','/projects/UP-P01','Employer','Contact','project@example.test','Project-only inquiry after upgrade');`);
  const constraints=await u`select conname,contype,confdeltype,convalidated,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.inquiries'::regclass order by conname`;
  log(`CONSTRAINTS ${JSON.stringify(constraints)}`);
  if(!constraints.some(r=>r.conname==='inquiries_student_profile_id_student_profiles_id_fk'&&r.confdeltype==='r'&&r.convalidated))throw Error('Profile FK not validated/restrictive');
  log('PROJECT-ONLY INQUIRY AFTER UPGRADE PASSED');
  await u.end();clients=clients.filter(x=>x!==u);
  const inquiry=await run('Phase 1 inquiry integration',['node_modules/vitest/vitest.mjs','run','tests/integration/inquiry-api.test.ts','--maxWorkers=1','--reporter=verbose']);
  if(inquiry.code!==0) throw Error('Inquiry integration failed; stop for investigation');
  const api=await run('API regressions',['node_modules/vitest/vitest.mjs','run','tests/integration/talent-api.test.ts','tests/integration/student-profile-api.test.ts','tests/integration/project-detail-api.test.ts','tests/integration/private-student-profile.test.ts','--maxWorkers=1','--reporter=verbose']);
  if(api.code!==0) throw Error('API regression failed; stop for investigation');
  const build=await run('production build',['node_modules/next/dist/bin/next','build'],180000);
  if(build.code!==0)throw Error('Build failed');
  const browser=await run('desktop and 390px UUID browser journey',['node_modules/@playwright/test/cli.js','test','tests/browser/private-student-profile.spec.ts','--reporter=list'],150000);
  if(browser.code!==0 || browser.timed)throw Error('Browser failed or teardown timeout; investigate');
  log('PHASE 1 VERIFICATION PASSED');
} catch(e) { log(`FAILURE ${clean(e.message)}`); process.exitCode=1; }
finally {
  for(const c of clients) await c.end({timeout:2}).catch(()=>{});
  if(id) {
    const label=docker(['inspect','--format','{{index .Config.Labels "immx.phase1.run"}}',id]);
    if(label!==token)throw Error('Refusing cleanup: container label mismatch');
    log(`COMMAND docker rm --force --volumes ${id} [verified run label]`);
    docker(['rm','--force','--volumes',id]);
    log('CLEANUP: created container and its disposable data removed; no existing resources touched');
  }
  for(const [p,hash] of Object.entries(hashes)) if(createHash('sha256').update(readFileSync(p)).digest('hex')!==hash)throw Error(`Preservation failure ${p}`);
  for(const [p,hash] of history)if(createHash('sha256').update(readFileSync(p)).digest('hex')!==hash)throw Error(`Historical migration modified ${p}`);
  log(`PRESERVATION: ${inputs.length} pre-existing untracked inputs and all historical SQL migrations unchanged`);
  writeFileSync(resolve('tmp','phase1-verification-last.log'),notes.join('\n'));
  rmSync(scratch,{recursive:true});
  if(execFileSync('git',['diff','--binary'],{encoding:'utf8'})!==baseline)log('Tracked diff changed during verification; review required');
}

```

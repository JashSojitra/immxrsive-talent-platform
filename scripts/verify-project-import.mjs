import { randomBytes, createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, sep } from 'node:path';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';

if (!process.argv.includes('--run-disposable')) throw new Error('Explicit --run-disposable is required; this creates and destroys a new local Docker test database.');
const token = randomBytes(6).toString('hex');
const name = `immx-phase5-${token}`;
const password = randomBytes(32).toString('hex');
const user = `phase5_${token}`;
const fresh = `${user}_fresh`, upgrade = `${user}_upgrade`, guard = `${user}_guard`;
const cluster = `immx-phase5-${token}`;
const scratch = resolve('tmp', name);
mkdirSync(resolve('tmp'), {recursive:true});
mkdirSync(scratch);
const baseline = execFileSync('git', ['diff', '--binary'], {encoding:'utf8'});
const inputs = execFileSync('git', ['ls-files','--others','--exclude-standard','-z'], {encoding:'utf8'}).split('\0').filter(p=>p && !p.startsWith('tmp/'));
const hashes = Object.fromEntries(inputs.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const history = readdirSync('drizzle').filter(p=>/^\d{4}_.*\.sql$/.test(p)).map(p=>`drizzle/${p}`).map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]);
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
  if(meta.Id!==id || meta.Config.Labels['immx.phase5.run']!==token || bindings.length!==1 || bindings[0].HostIp!=='127.0.0.1' || bindings[0].HostPort!==port) throw Error('Container identity or binding mismatch');
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
  log(`COMMAND docker run --detach --name ${name} --label immx.phase5.run=${token} --publish 127.0.0.1::5432 --tmpfs /var/lib/postgresql -e POSTGRES_USER -e POSTGRES_PASSWORD -e POSTGRES_DB postgres:18 -c cluster_name=${cluster}`);
  id=execFileSync('docker',['run','--detach','--name',name,'--label',`immx.phase5.run=${token}`,'--publish','127.0.0.1::5432','--tmpfs','/var/lib/postgresql','-e','POSTGRES_USER','-e','POSTGRES_PASSWORD','-e','POSTGRES_DB','postgres:18','-c',`cluster_name=${cluster}`],{encoding:'utf8',env:{...process.env,POSTGRES_USER:user,POSTGRES_PASSWORD:password,POSTGRES_DB:fresh},timeout:180000,stdio:['ignore','pipe','pipe']}).trim();
  port=JSON.parse(docker(['inspect','--format','{{json .NetworkSettings.Ports}}',id]))['5432/tcp'][0].HostPort;
  for(let i=0;i<40;i++) { try { docker(['exec',id,'pg_isready','-U',user,'-d',fresh]); break; } catch { if(i===39)throw Error('Container readiness timeout'); await new Promise(r=>setTimeout(r,500)); } }
  for (let attempt=0; ; attempt++) {
    try { await verify(fresh); break; }
    catch (error) { if (attempt >= 39 || !['57P03','ECONNREFUSED','ECONNRESET','CONNECTION_CLOSED'].includes(error.code)) throw error; await new Promise(r=>setTimeout(r,500)); }
  }
  log(`IMAGE ${docker(['inspect','--format','{{.Image}}',id])}`);
  const c=connection(fresh);
  await c.unsafe('CREATE ROLE postgres NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;');
  await c.unsafe(`CREATE DATABASE "${upgrade}"`); await c.unsafe(`CREATE DATABASE "${guard}"`);
  await c.end(); clients=clients.filter(x=>x!==c);
  const url=db=>`postgresql://${user}:${password}@127.0.0.1:${port}/${db}`;
  environment={...process.env,NODE_OPTIONS:`--import=${pathToFileURL(resolve('tests/fixtures/github-fetch.mjs')).href}`,DATABASE_URL:url(guard),DATABASE_MIGRATION_URL:url(guard),DEVELOPMENT_DATABASE_URL:url(guard),TEST_DATABASE_URL:url(fresh),BETTER_AUTH_URL:'http://127.0.0.1:3100',BETTER_AUTH_SECRET:randomBytes(32).toString('hex'),GITHUB_CLIENT_ID:'isolated-test-client',GITHUB_CLIENT_SECRET:'isolated-test-secret',EMAIL_PROVIDER:'gmail',GMAIL_SMTP_USER:'isolated@example.test',GMAIL_SMTP_APP_PASSWORD:'isolated-not-real',RESEND_API_KEY:'isolated-not-real',AFFILIATION_EMAIL_FROM:'isolated@example.test',IMMXRSIVE_BROWSER_TEST_RUNTIME:'1'};
  await apply(fresh,'drizzle');
  const prefix=resolve(scratch,'pre0010'); mkdirSync(resolve(prefix,'meta'),{recursive:true});
  const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8')); const old={...journal,entries:journal.entries.filter(e=>e.idx<10)};
  writeFileSync(resolve(prefix,'meta/_journal.json'),JSON.stringify(old));
  for(const e of old.entries) copyFileSync(`drizzle/${e.tag}.sql`,resolve(prefix,`${e.tag}.sql`));
  await apply(upgrade,prefix);
  await verify(upgrade);
  const u=connection(upgrade);
  await u.unsafe(`INSERT INTO students VALUES ('UP-S01','Legacy Student','Legacy headline','Computing','current','published');
    INSERT INTO projects (id,title,description,domain,origin,publication_status) VALUES ('UP-P01','Legacy project','Existing description','Training','legacy_fixture','published');
    INSERT INTO project_contributors VALUES ('UP-P01','UP-S01','XR Developer',0);
    INSERT INTO project_technologies VALUES ('UP-P01','Unity',0);
    INSERT INTO auth_users (id,name,email) VALUES ('UP-USER','Upgrade student','upgrade@example.test');
    INSERT INTO student_profiles (id,owner_user_id) VALUES ('11111111-1111-4111-8111-111111111111','UP-USER');
    INSERT INTO projects (id,title,description,domain,origin,maintainer_user_id,publication_status,version) VALUES ('UP-MANAGED','Managed before upgrade','Preserved shared work','XR','student','UP-USER','published',7);
    INSERT INTO project_memberships (id,project_id,profile_id,state,proposed_role_id,invited_by_user_id,accepted_at) VALUES ('22222222-2222-4222-8222-222222222222','UP-MANAGED','11111111-1111-4111-8111-111111111111','accepted','xr-developer','UP-USER',now());
    INSERT INTO project_contributions (membership_id,role_id,statement,featured,public_visible,version) VALUES ('22222222-2222-4222-8222-222222222222','xr-developer','Preserve my personal evidence',false,false,3);
    INSERT INTO project_repositories (project_id,url,normalized_key,display_order) VALUES ('UP-MANAGED','https://github.com/upgrade/example','https://github.com/upgrade/example',0);
    INSERT INTO inquiries (source_type,student_id,source_id,source_name,source_url,company_name,contact_name,contact_email,description) VALUES ('student','UP-S01','UP-S01','Legacy Student','/students/UP-S01','Legacy Employer','Contact','legacy@example.test','Existing student inquiry');
    INSERT INTO inquiries (source_type,project_id,source_id,source_name,source_url,company_name,contact_name,contact_email,description) VALUES ('project','UP-P01','UP-P01','Legacy project','/projects/UP-P01','Legacy Employer','Contact','legacy@example.test','Existing project inquiry');`);
  async function snapshot() { const result={}; for(const table of ['students','projects','project_contributors','project_technologies','inquiries','auth_users','student_profiles','project_memberships','project_contributions','project_repositories']) result[table]=await u.unsafe(`select to_jsonb(t)  as row from ${table} t order by to_jsonb(t)::text`); return JSON.stringify(result); }
  const before=await snapshot();
  await apply(upgrade,'drizzle');
  if(await snapshot()!==before) throw Error('Upgrade changed historical records');
  const [legacy] = await u`select origin, maintainer_user_id, publication_status, version from projects where id='UP-P01'`;
  if(legacy.origin!=='legacy_fixture' || legacy.maintainer_user_id!==null || legacy.publication_status!=='published' || legacy.version!==1) throw Error('Legacy project defaults changed public access or granted ownership');
  log('UPGRADE LEGACY DEFAULTS VERIFIED: published, unmanaged, version 1');
  log('UPGRADE PASSED: legacy and account-owned shared projects, memberships, personal evidence, repositories, profiles and inquiries unchanged');
  await u.unsafe(`INSERT INTO inquiries (source_type,project_id,source_id,source_name,source_url,company_name,contact_name,contact_email,description) VALUES ('project','UP-P01','UP-P01','Legacy project','/projects/UP-P01','Employer','Contact','project@example.test','Project-only inquiry after upgrade');`);
  const constraints=await u`select conname,contype,confdeltype,convalidated,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.inquiries'::regclass order by conname`;
  log(`CONSTRAINTS ${JSON.stringify(constraints)}`);
  if(!constraints.some(r=>r.conname==='inquiries_student_profile_id_student_profiles_id_fk'&&r.confdeltype==='r'&&r.convalidated))throw Error('Profile FK not validated/restrictive');
  log('PROJECT-ONLY INQUIRY AFTER UPGRADE PASSED');
  await u.end();clients=clients.filter(x=>x!==u);
  const inquiry=await run('Phase 5 inquiry integration',['node_modules/vitest/vitest.mjs','run','tests/integration/project-import-api.test.ts','tests/integration/project-team-api.test.ts','tests/integration/manual-project-api.test.ts','tests/integration/shared-projects.test.ts','tests/integration/fixture-import.test.ts','tests/integration/inquiry-api.test.ts','--maxWorkers=1','--reporter=verbose']);
  if(inquiry.code!==0) throw Error('Inquiry integration failed; stop for investigation');
  const api=await run('API regressions',['node_modules/vitest/vitest.mjs','run','tests/integration/talent-api.test.ts','tests/integration/student-profile-api.test.ts','tests/integration/project-detail-api.test.ts','tests/integration/private-student-profile.test.ts','--maxWorkers=1','--reporter=verbose']);
  if(api.code!==0) throw Error('API regression failed; stop for investigation');
  const build=await run('production build',['node_modules/next/dist/bin/next','build'],180000);
  if(build.code!==0)throw Error('Build failed');
  const unit=await run('unit and frontend suites',['node_modules/vitest/vitest.mjs','run','--exclude','tests/integration/**','--maxWorkers=1'],150000);
  if(unit.code!==0)throw Error('Unit/frontend tests failed');
  const browser=await run('complete browser regression and manual journeys',['node_modules/@playwright/test/cli.js','test','--reporter=list'],420000);
  if(browser.code!==0 || browser.timed)throw Error('Browser tests failed or timed out');
  log('PHASE 5 VERIFICATION PASSED');
} catch(e) { log(`FAILURE ${clean(e.message)}`); process.exitCode=1; }
finally {
  for(const c of clients) await c.end({timeout:2}).catch(()=>{});
  if(id) {
    const label=docker(['inspect','--format','{{index .Config.Labels "immx.phase5.run"}}',id]);
    if(label!==token)throw Error('Refusing cleanup: container label mismatch');
    log(`COMMAND docker rm --force --volumes ${id} [verified run label]`);
    docker(['rm','--force','--volumes',id]);
    log('CLEANUP: created container and its disposable data removed; no existing resources touched');
  }
  for(const [p,hash] of Object.entries(hashes)) if(createHash('sha256').update(readFileSync(p)).digest('hex')!==hash)throw Error(`Preservation failure ${p}`);
  for(const [p,hash] of history)if(createHash('sha256').update(readFileSync(p)).digest('hex')!==hash)throw Error(`Historical migration modified ${p}`);
  log(`PRESERVATION: ${inputs.length} pre-existing untracked inputs and all historical SQL migrations unchanged`);
  writeFileSync(resolve('tmp','phase5-verification-last.log'),notes.join('\n'));
  if (!scratch.startsWith(resolve('tmp') + sep)) throw Error('Refusing cleanup outside verification workspace');
  rmSync(scratch,{recursive:true});
  if(execFileSync('git',['diff','--binary'],{encoding:'utf8'})!==baseline)log('Tracked diff changed during verification; review required');
}

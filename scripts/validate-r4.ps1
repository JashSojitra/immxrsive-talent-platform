# Windows PowerShell 5.1+ / Node >=22.12 / Docker Desktop (Linux containers).
[CmdletBinding()]
param(
  [string]$ExpectedBranch = 'feat/r4-staff-industry-collaborations',
  [switch]$InstallDependencies,
  [switch]$InstallBrowser,
  [switch]$FocusedOnly,
  [switch]$ReuseBuild
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
$container = 'immxrsive-r4-' + [guid]::NewGuid().ToString('N')
$database = 'immxrsive_test_' + [guid]::NewGuid().ToString('N')
$password = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$created = $false
$failed = $false
$results = [System.Collections.Generic.List[object]]::new()
$names = @('DATABASE_URL', 'TEST_DATABASE_URL', 'DEVELOPMENT_DATABASE_URL', 'DATABASE_MIGRATION_URL',
  'POSTGRES_PASSWORD', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET', 'IMMXRSIVE_BROWSER_TEST_RUNTIME', 'NODE_OPTIONS', 'CI',
  'EMAIL_PROVIDER', 'RESEND_API_KEY', 'GMAIL_SMTP_USER', 'GMAIL_SMTP_APP_PASSWORD',
  'PLAYWRIGHT_JSON_OUTPUT_NAME', 'PLAYWRIGHT_HTML_OUTPUT_DIR', 'IMMXRSIVE_PLAYWRIGHT_OUTPUT_DIR', 'FORCE_COLOR', 'NO_COLOR')
$saved = @{}
foreach ($name in $names) { $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$report = Join-Path $env:TEMP ('immxrsive-r4-results-' + [guid]::NewGuid().ToString('N'))
function Sanitize([string]$Value) {
  $Value = $Value.Replace($password, '[REDACTED]')
  foreach ($name in $names) {
    if ($name -match 'URL|SECRET|PASSWORD|API_KEY|TOKEN' -and $saved[$name]) {
      $Value = $Value.Replace($saved[$name], "[$name]")
    }
  }
  return ($Value -replace 'postgres(?:ql)?://[^\s"''<>]+', '[DATABASE_URL]' -replace '\x1b\[[0-9;]*m', '')
}
function Save-Results {
  ConvertTo-Json -InputObject @($results.ToArray()) -Depth 3 | Set-Content -Encoding UTF8 (Join-Path $report 'results.json')
}
function Check-Native([string]$Program, [string[]]$Arguments) {
  $output = & $Program @Arguments 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw (Sanitize "$Program failed: $output") }
  return $output.Trim()
}
function Run-Check([string]$Name, [string]$Program, [string[]]$Arguments) {
  $code = 1
  $output = ''
  $timer = [Diagnostics.Stopwatch]::StartNew()
  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & $Program @Arguments 2>&1 | Out-String
    $code = $LASTEXITCODE
  } catch {
    $output += ($_ | Out-String)
    $code = 1
  } finally { $ErrorActionPreference = $oldPreference }
  Sanitize $output | Set-Content -Encoding UTF8 (Join-Path $report "$Name.log")
  $results.Add([pscustomobject]@{ Check = $Name; ExitCode = $code; Seconds = [math]::Round($timer.Elapsed.TotalSeconds, 1) })
  Save-Results
  Write-Host "$Name : $(if ($code -eq 0) { 'PASS' } else { 'FAIL' })"
}
try {
  New-Item -ItemType Directory $report | Out-Null
  Write-Host "Sanitized validation results: $report"
  foreach ($tool in @('git', 'node', 'npm.cmd', 'npx.cmd', 'docker')) { Get-Command $tool -ErrorAction Stop | Out-Null }
  $branch = Check-Native 'git' @('branch', '--show-current')
  if ($branch -ne $ExpectedBranch -or $ExpectedBranch -ne 'feat/r4-staff-industry-collaborations') { throw 'Wrong R4 branch; refusing validation.' }
  if ($FocusedOnly -or $ReuseBuild) { throw 'R4 acceptance requires cumulative checks and a fresh build.' }
  # Next and dotenv automatically read these files; never load real credentials.
  $dotenvFiles = Get-ChildItem -Force -File -Filter '.env*' | Where-Object { $_.Name -notin @('.env.example', '.env.sample', '.env.template') }
  if ($dotenvFiles) { throw 'Use an isolated checkout without runtime .env files.' }
  $nodeVersion = Check-Native 'node' @('-p', 'process.versions.node')
  if ([version]$nodeVersion -lt [version]'22.12.0') { throw 'Node >=22.12 is required.' }
  Check-Native 'docker' @('info', '--format', '{{.ServerVersion}}') | Out-Null
  $env:POSTGRES_PASSWORD = $password
  $env:NODE_OPTIONS = ''
  $env:CI = '1'
  $env:FORCE_COLOR = ''
  $env:NO_COLOR = '1'
  $env:EMAIL_PROVIDER = 'disabled'
  $env:RESEND_API_KEY = ''
  $env:GMAIL_SMTP_USER = ''
  $env:GMAIL_SMTP_APP_PASSWORD = ''
  $env:BETTER_AUTH_SECRET = 'disposable-validation-secret-at-least-32-characters'
  $env:BETTER_AUTH_URL = 'http://127.0.0.1:3100'
  $env:GITHUB_CLIENT_ID = 'disposable-client'
  $env:GITHUB_CLIENT_SECRET = 'disposable-secret'
  $env:IMMXRSIVE_BROWSER_TEST_RUNTIME = '1'
  $env:DATABASE_MIGRATION_URL = ''
  $env:PLAYWRIGHT_JSON_OUTPUT_NAME = Join-Path $report 'browser-results.json'
  $env:PLAYWRIGHT_HTML_OUTPUT_DIR = Join-Path $report 'browser-html'
  $env:IMMXRSIVE_PLAYWRIGHT_OUTPUT_DIR = Join-Path $report 'browser-artifacts'
  $created = $true
  Check-Native 'docker' @('run', '--detach', '--rm', '--name', $container, '--label', "immxrsive.validation=$container",
    '--publish', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data', '--env', 'POSTGRES_PASSWORD', '--env', "POSTGRES_DB=$database", 'postgres:17') | Out-Null
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    & docker exec $container pg_isready -U postgres -d $database *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Disposable PostgreSQL did not become ready in 60 seconds.' }
  $mapping = Check-Native 'docker' @('port', $container, '5432/tcp')
  if ($mapping -notmatch '^127\.0\.0\.1:(\d+)$') { throw 'Expected an exclusive loopback Docker port.' }
  $port = $Matches[1]
  $env:TEST_DATABASE_URL = "postgresql://postgres:${password}@127.0.0.1:${port}/$database"
  $env:DATABASE_URL = $env:TEST_DATABASE_URL
  $env:DEVELOPMENT_DATABASE_URL = "postgresql://unused@127.0.0.1:${port}/unused_development_identity"
  Check-Native 'docker' @('exec', $container, 'psql', '-U', 'postgres', '-d', $database, '-v', 'ON_ERROR_STOP=1',
    '-c', 'CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;') | Out-Null
  if ($InstallDependencies -or -not (Test-Path 'node_modules/.package-lock.json')) {
    Run-Check 'install' 'npm.cmd' @('ci', '--no-audit', '--no-fund')
    if ($results[-1].ExitCode -ne 0) { throw 'Dependency installation failed.' }
  }
  Run-Check 'candidate-history' 'node' @('scripts/validate-r4-candidate.mjs')
  Run-Check 'fixtures' 'npm.cmd' @('run', 'fixtures:validate')
  Run-Check 'migrations' 'npm.cmd' @('run', 'db:migrate:test')
  if ($results[-1].ExitCode -ne 0) { throw 'Migrations failed.' }
  if ($FocusedOnly) {
    Run-Check 'integration-focused' 'node' @('node_modules/vitest/vitest.mjs', 'run', 'tests/integration/inquiry-api.test.ts')
  } else {
    foreach ($check in @('typecheck', 'lint', 'unit', 'frontend', 'integration')) {
      $script = if ($check -in @('typecheck', 'lint')) { $check } else { "test:$check" }
      Run-Check $check 'npm.cmd' @('run', $script)
    }
  }
  if (-not $ReuseBuild) {
    Run-Check 'build' 'npm.cmd' @('run', 'build')
    if ($results[-1].ExitCode -ne 0) { throw 'Build failed; browser validation blocked.' }
  } elseif (-not (Test-Path '.next/BUILD_ID')) { throw 'No existing build to reuse.' }
  if ($InstallBrowser) {
    Run-Check 'browser-install' 'npx.cmd' @('playwright', 'install', 'chromium')
    if ($results[-1].ExitCode -ne 0) { throw 'Chromium installation failed.' }
  }
  $browserArgs = @('playwright', 'test', '--reporter=line,json')
  if ($FocusedOnly) { $browserArgs += @('auth.spec.ts', 'inquiry.spec.ts', 'project-import.spec.ts') }
  Run-Check 'browser' 'npx.cmd' $browserArgs
  if (Test-Path $env:PLAYWRIGHT_JSON_OUTPUT_NAME) {
    $json = Get-Content -Raw $env:PLAYWRIGHT_JSON_OUTPUT_NAME
    Sanitize $json | Set-Content -Encoding UTF8 $env:PLAYWRIGHT_JSON_OUTPUT_NAME
  }
} catch {
  $failed = $true
  $results.Add([pscustomobject]@{ Check = 'runner'; ExitCode = 1; Seconds = 0 })
  Sanitize ($_ | Out-String) | Set-Content -Encoding UTF8 (Join-Path $report 'runner-error.log')
  Write-Warning 'Runner failed; see runner-error.log.'
} finally {
  try {
    if ($created) {
      $oldPreference = $ErrorActionPreference
      $ErrorActionPreference = 'Continue'
      try {
        $labelJson = (& docker inspect --format '{{json .Config.Labels}}' $container 2>$null | Out-String).Trim()
        $inspectCode = $LASTEXITCODE
        $label = if ($inspectCode -eq 0) { ($labelJson | ConvertFrom-Json).'immxrsive.validation' } else { $null }
        if ($inspectCode -eq 0 -and $label -eq $container) {
          & docker rm --force --volumes $container *> $null
          if ($LASTEXITCODE -ne 0) { throw 'Disposable container cleanup failed.' }
        } else {
          $remaining = & docker ps -a --filter "name=^/$container`$" --format '{{.Names}}'
          if ($LASTEXITCODE -ne 0 -or $remaining) { throw 'Could not verify disposable container ownership/absence.' }
        }
        $results.Add([pscustomobject]@{ Check = 'cleanup'; ExitCode = 0; Seconds = 0 })
      } catch {
        $failed = $true
        $results.Add([pscustomobject]@{ Check = 'cleanup'; ExitCode = 1; Seconds = 0 })
        Sanitize ($_ | Out-String) | Set-Content -Encoding UTF8 (Join-Path $report 'cleanup-error.log')
        Write-Warning "Cleanup requires attention: $container"
      } finally { $ErrorActionPreference = $oldPreference }
    }
    if (Test-Path $report) { Save-Results; Write-Host ('Failed checks: ' + @($results | Where-Object { $_.ExitCode -ne 0 }).Count); $results | Format-Table -AutoSize; Write-Host "Sanitized validation results: $report" }
  } finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
    Pop-Location
  }
}
if ($failed -or @($results | Where-Object { $_.ExitCode -ne 0 }).Count -gt 0) { exit 1 }
exit 0

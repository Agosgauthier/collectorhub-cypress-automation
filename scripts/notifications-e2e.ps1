[CmdletBinding()]
param(
    [ValidateSet('Check', 'InspectPending', 'CleanupPending', 'Run', 'Open')]
    [string]$Mode = 'Check',
    [string]$AppPath = (Join-Path $PSScriptRoot '../../grupo3/Proyecto'),
    [string]$MongoUri = 'mongodb://127.0.0.1:27017',
    [string]$PhpBinary = 'php',
    [ValidatePattern('^[a-f0-9]{32}$')]
    [string[]]$InspectionContexts,
    [switch]$RequireEmpty
)

$ErrorActionPreference = 'Stop'
if (($InspectionContexts -or $RequireEmpty) -and $Mode -ne 'InspectPending') {
    throw 'InspectionContexts and RequireEmpty are allowed only with InspectPending.'
}
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$appRoot = (Resolve-Path -LiteralPath $AppPath).Path
$phpExecutable = (Get-Command $PhpBinary -CommandType Application).Source
$nodeExecutable = (Get-Command node -CommandType Application).Source
$routerPath = Join-Path $repoRoot 'cypress/tasks/notifications-server.php'
$taskPath = Join-Path $repoRoot 'cypress/tasks/notificationsData.js'
$cypressPath = Join-Path $repoRoot 'node_modules/cypress/bin/cypress'
if (!(Test-Path -LiteralPath (Join-Path $appRoot 'vendor/autoload.php'))) {
    throw 'Laravel dependencies were not found. Nothing was started.'
}
if ($Mode -in @('Run', 'Open') -and !(Test-Path -LiteralPath $cypressPath)) {
    throw 'Local Cypress was not found. This script does not install dependencies.'
}
if (Test-Path -LiteralPath (Join-Path $appRoot 'bootstrap/cache/config.php')) {
    throw 'Cached Laravel configuration is not allowed. Nothing was started.'
}

# Refuse an occupied port; never reuse or stop an existing server.
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8010)
try { $listener.Start() } catch { throw 'Port 8010 is occupied. No existing process was stopped.' }
finally { $listener.Stop() }

function Read-PendingContext([string]$Context) {
    $output = & $nodeExecutable $taskPath inspect $Context
    if ($LASTEXITCODE -ne 0) { throw "Read-only inspection failed for context $Context." }
    $inspection = ($output -join "`n") | ConvertFrom-Json
    if ($inspection.ok -ne $true -or $inspection.readOnly -ne $true `
        -or $inspection.database -cne 'coleccionistas_e2e' -or $inspection.context -cne $Context) {
        throw 'Invalid read-only inspection response.'
    }
    foreach ($field in @('candidateUserCount', 'userCount', 'notificationCount',
        'taggedNotificationCount', 'eligibleNotificationCount')) {
        $value = $inspection.$field
        if (($value -isnot [int] -and $value -isnot [long]) -or $value -lt 0) {
            throw "Missing or invalid count $field for context $Context."
        }
    }
    if ($null -eq $inspection.PSObject.Properties['conflicts'] `
        -or $null -eq $inspection.PSObject.Properties['notifications']) {
        throw 'Incomplete inspection response.'
    }
    return $inspection
}

function Assert-PendingCounts($Inspection, [int]$Users, [int]$Notifications) {
    if (@($Inspection.conflicts).Count -ne 0 `
        -or $Inspection.candidateUserCount -ne $Users -or $Inspection.userCount -ne $Users `
        -or $Inspection.notificationCount -ne $Notifications `
        -or $Inspection.taggedNotificationCount -ne $Notifications `
        -or $Inspection.eligibleNotificationCount -ne $Notifications `
        -or @($Inspection.notifications).Count -ne $Notifications) {
        throw "Unexpected counts or ownership conflicts for context $($Inspection.context). No further cleanup will run."
    }
}

$environmentNames = @('E2E_APP_PATH', 'E2E_MONGODB_URI', 'E2E_SERVER_TOKEN',
    'E2E_PHP_BINARY', 'E2E_ALLOW_WRITES', 'CYPRESS_BASE_URL', 'PHP_CLI_SERVER_WORKERS')
$savedEnvironment = @{}
foreach ($name in $environmentNames) {
    $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
$serverProcess = $null
$exitCode = 0
Push-Location $repoRoot
try {
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $bytes = New-Object byte[] 32
        $random.GetBytes($bytes)
        $privateToken = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    } finally { $random.Dispose() }
    $env:E2E_APP_PATH = $appRoot
    $env:E2E_MONGODB_URI = $MongoUri
    $env:E2E_SERVER_TOKEN = $privateToken
    $env:E2E_PHP_BINARY = $phpExecutable
    $env:CYPRESS_BASE_URL = 'http://127.0.0.1:8010'
    [Environment]::SetEnvironmentVariable('E2E_ALLOW_WRITES', $null, 'Process')
    [Environment]::SetEnvironmentVariable('PHP_CLI_SERVER_WORKERS', $null, 'Process')

    # The private token is inherited, never placed on a command line or printed.
    $serverArguments = @('-S', '127.0.0.1:8010', '-t', ('"' + $appRoot + '/public"'), ('"' + $routerPath + '"'))
    $serverProcess = Start-Process -FilePath $phpExecutable -ArgumentList $serverArguments `
        -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    $listening = $false
    do {
        if ($serverProcess.HasExited) { throw 'The isolated PHP process exited during startup.' }
        $client = [System.Net.Sockets.TcpClient]::new()
        try { $client.Connect('127.0.0.1', 8010); $listening = $true }
        catch { Start-Sleep -Milliseconds 100 }
        finally { $client.Dispose() }
    } until ($listening -or [DateTime]::UtcNow -ge $deadline)
    if (!$listening) { throw 'Timed out waiting for the isolated PHP listener.' }

    # Authenticated read-only check MUST succeed before write opt-in or Cypress.
    & $nodeExecutable $taskPath check
    if ($LASTEXITCODE -ne 0) { throw 'Read-only attestation failed. No data was prepared.' }
    if ($Mode -eq 'Check') {
        Write-Host 'Read-only check complete. No test data was created.'
    } elseif ($Mode -in @('InspectPending', 'CleanupPending')) {
        # Context order and expected counts are fixed to the inspected recovery set.
        $contexts = @(
            '923e6af60641bc88153ab866bd765362',
            'd08dcbdd75a76c424752e0c2b18aa378',
            '15c663fec51cdbc54830ddbe25ad2c02',
            '68207c620c780761b8529f3013b9cc70',
            '21ecc0f50018caf390f60d28ab820264',
            'a513d8da9a62fde68b8a7b124032d882'
        )
        if ($Mode -eq 'InspectPending' -and $InspectionContexts) {
            $contexts = @($InspectionContexts | Select-Object -Unique)
        }
        $expectedNotifications = @(1, 1, 1, 5, 5, 5)
        $before = @{}
        # Inspect ALL six contexts while writes are still disabled.
        $report = foreach ($context in $contexts) {
            $inspection = Read-PendingContext $context
            $before[$context] = $inspection
            [pscustomobject]@{
                Context = $context
                Users = $inspection.candidateUserCount
                OwnedUsers = $inspection.userCount
                Notifications = $inspection.notificationCount
                Tagged = $inspection.taggedNotificationCount
                Eligible = $inspection.eligibleNotificationCount
                Conflicts = ($inspection.conflicts -join ',')
            }
        }
        $report | Format-Table -AutoSize | Out-String -Width 240 | Write-Host
        if ($Mode -eq 'InspectPending') {
            if ($RequireEmpty) {
                foreach ($context in $contexts) {
                    Assert-PendingCounts $before[$context] 0 0
                }
                Write-Host 'Verified: all requested contexts have zero users and zero notifications, without conflicts.'
            }
            Write-Host 'Read-only inspection complete. No records were created or deleted.'
        } else {
            for ($index = 0; $index -lt $contexts.Count; $index++) {
                Assert-PendingCounts $before[$contexts[$index]] 3 $expectedNotifications[$index]
            }
            $totalUsers = ($report | Measure-Object -Property Users -Sum).Sum
            $totalNotifications = ($report | Measure-Object -Property Notifications -Sum).Sum
            if ($contexts.Count -ne 6 -or $totalUsers -ne 18 -or $totalNotifications -ne 18) {
                throw 'Recovery requires exactly 6 contexts, 18 owned users and 18 eligible notifications.'
            }
            Write-Host 'Target: coleccionistas_e2e. Only the six contexts listed above will be cleaned.'
            Write-Host 'Expected deletion: 18 users and 18 notifications. Writes are still disabled.'
            $requiredConfirmation = 'ELIMINAR 18 USUARIOS Y 18 NOTIFICACIONES EN coleccionistas_e2e'
            $confirmation = Read-Host "Para confirmar, escribi exactamente: $requiredConfirmation"
            if ($confirmation -cne $requiredConfirmation) {
                throw 'Confirmation did not match. No cleanup was executed.'
            }
            # Revalidate ALL contexts after the human confirmation delay, still read-only.
            for ($index = 0; $index -lt $contexts.Count; $index++) {
                $context = $contexts[$index]
                $current = Read-PendingContext $context
                Assert-PendingCounts $current 3 $expectedNotifications[$index]
                $originalIds = @($before[$context].notifications | ForEach-Object { $_.id } | Sort-Object)
                $currentIds = @($current.notifications | ForEach-Object { $_.id } | Sort-Object)
                if (($originalIds -join ',') -cne ($currentIds -join ',')) {
                    throw "Notification IDs changed during confirmation for context $context. Cleanup cancelled."
                }
            }
            $deletedUsers = 0
            $deletedNotifications = 0
            try {
                $env:E2E_ALLOW_WRITES = 'YES'
                for ($index = 0; $index -lt $contexts.Count; $index++) {
                    $context = $contexts[$index]
                    # The existing helper attests the server and validates ownership again.
                    $current = Read-PendingContext $context
                    Assert-PendingCounts $current 3 $expectedNotifications[$index]
                    $output = & $nodeExecutable $taskPath cleanup $context
                    if ($LASTEXITCODE -ne 0) { throw "Cleanup failed for $context. No further contexts will be processed." }
                    $result = ($output -join "`n") | ConvertFrom-Json
                    if ($result.ok -ne $true -or $result.remainingUsers -ne 0 `
                        -or $result.remainingNotifications -ne 0 -or $result.deletedUsers -ne 3 `
                        -or $result.deletedNotifications -ne $expectedNotifications[$index]) {
                        throw "Unexpected cleanup result for $context. No further contexts will be processed."
                    }
                    $deletedUsers += $result.deletedUsers
                    $deletedNotifications += $result.deletedNotifications
                    Write-Host "Cleaned context: $context"
                }
            } finally {
                [Environment]::SetEnvironmentVariable('E2E_ALLOW_WRITES', $null, 'Process')
            }
            # Reinspect all six through the attested, read-only path after writes are disabled.
            $after = foreach ($context in $contexts) {
                $inspection = Read-PendingContext $context
                Assert-PendingCounts $inspection 0 0
                [pscustomobject]@{ Context = $context; Users = $inspection.candidateUserCount;
                    Notifications = $inspection.notificationCount }
            }
            if ($deletedUsers -ne 18 -or $deletedNotifications -ne 18) {
                throw 'Unexpected total deleted counts; inspect the recovery contexts.'
            }
            $after | Format-Table -AutoSize | Out-String -Width 240 | Write-Host
            Write-Host 'Verified: all six contexts have zero users and zero notifications. Writes disabled.'
        }
    } else {
        $env:E2E_ALLOW_WRITES = 'YES'
        if ($Mode -eq 'Run') {
            & $nodeExecutable $cypressPath run --e2e --spec 'cypress/e2e/notifications.cy.js'
        } else {
            # Restrict the visual runner to this spec as well.
            & $nodeExecutable $cypressPath open --e2e --config 'specPattern=cypress/e2e/notifications.cy.js,experimentalInteractiveRunEvents=true'
        }
        $exitCode = $LASTEXITCODE
    }
} finally {
    # Only stop the exact process launched by this script.
    if ($null -ne $serverProcess -and !$serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue
    }
    foreach ($name in $environmentNames) {
        [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
    }
    $privateToken = $null
    Pop-Location
}
if ($exitCode -ne 0) { throw "Cypress exited with code $exitCode. Check failures and cleanup contexts in its output." }

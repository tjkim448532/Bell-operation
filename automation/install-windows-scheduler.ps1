# ============================================================================
# 벨포레 인사(HR) 무인 자동화 - Windows 작업 스케줄러(Task Scheduler) 원클릭 등록기
# - 매일 오전 08:00 : 현장 단말기(캐디POS·웰스토리식수·주차LPR·아마란스) 무인 수집 데몬 실행
# - 매일 오전 08:30 : 6대 외부포털 & 아마란스 그룹웨어 무인 RPA 봇 실행 및 전사 급여 정산
# 실행 방법: npm run scheduler:install
# ============================================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$NodePath = (Get-Command node -ErrorAction Stop).Source

$CollectorTaskName = "Belleforet_HR_Daily_Collector_0800"
$RpaTaskName = "Belleforet_HR_Auto_RPA_Runner_0830"

$CollectorScript = Join-Path $PSScriptRoot "collector-daemon.mjs"
$RpaScript = Join-Path $PSScriptRoot "rpa-bot-runner.mjs"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host " [Belleforet HR Zero-Touch] Registering Windows Scheduled Tasks..." -ForegroundColor Cyan
Write-Host " Project Root : $ProjectRoot"
Write-Host " Node Binary  : $NodePath"
Write-Host "========================================================================" -ForegroundColor Cyan

# 1. Daily 08:00 Collector Daemon
$Action1 = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$CollectorScript`"" -WorkingDirectory $ProjectRoot
$Trigger1 = New-ScheduledTaskTrigger -Daily -At "08:00"
$Settings1 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $CollectorTaskName -Action $Action1 -Trigger $Trigger1 -Settings $Settings1 -Description "Belleforet HR Daily 08:00 Zero-Touch Collector Daemon (POS/Welstory/LPR/Amaranth)" -Force | Out-Null
Write-Host "[OK 1/2] Registered: $CollectorTaskName (Daily 08:00 Collector Daemon)" -ForegroundColor Green

# 2. Daily 08:30 RPA Bot Runner
$Action2 = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$RpaScript`"" -WorkingDirectory $ProjectRoot
$Trigger2 = New-ScheduledTaskTrigger -Daily -At "08:30"
$Settings2 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $RpaTaskName -Action $Action2 -Trigger $Trigger2 -Settings $Settings2 -Description "Belleforet HR Daily 08:30 Zero-Touch 6-Portal RPA Runner" -Force | Out-Null
Write-Host "[OK 2/2] Registered: $RpaTaskName (Daily 08:30 6-Portal RPA Runner)" -ForegroundColor Green

Write-Host "------------------------------------------------------------------------"
Write-Host " [Verified Windows Scheduled Tasks]:" -ForegroundColor Yellow
Get-ScheduledTask -TaskName "Belleforet_HR_*" | Select-Object TaskName, State, Description | Format-Table -AutoSize
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host " [100% Completed] Unattended Windows Task Scheduler is now active!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan

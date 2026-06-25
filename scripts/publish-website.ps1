[CmdletBinding()]
param(
    [string]$Branch = "main",
    [string]$Remote = "origin",
    [string]$CommitMessage = "",
    [switch]$SkipInstall,
    [switch]$NoPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$script:RepoRoot = Split-Path -Parent $PSScriptRoot
$script:FrontendDir = Join-Path $script:RepoRoot "frontend"
$script:TrackedPaths = @("content", "notes", "blog")

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-CommandExists {
    param([string]$CommandName)
    return $null -ne (Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$ScriptBlock,
        [string]$ErrorMessage = "命令执行失败"
    )

    & $ScriptBlock
    if ($LASTEXITCODE -ne 0) {
        throw $ErrorMessage
    }
}

function Get-GitOutput {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $output = & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') 执行失败"
    }
    return ($output | Out-String).Trim()
}

function Ensure-RequiredEnvironment {
    $envFile = Join-Path $script:RepoRoot ".env"
    $envMap = @{}
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Encoding utf8
        foreach ($line in $envContent) {
            if ($line -match "^\s*([A-Za-z0-9_]+)\s*=") {
                $envMap[$Matches[1]] = $true
            }
        }
    }

    # 这里同时兼容系统环境变量和 .env 文件，避免用户必须重复配置两份。
    $requiredKeys = @("NOTION_TOKEN")
    foreach ($key in $requiredKeys) {
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key)) -and -not $envMap.ContainsKey($key)) {
            throw "未检测到 $key，请先在系统环境变量或仓库根目录 .env 中配置。"
        }
    }
}

function Ensure-RepositoryState {
    Write-Step "检查仓库与分支状态"

    if (-not (Test-Path (Join-Path $script:RepoRoot ".git"))) {
        throw "当前目录不是 Git 仓库根目录：$script:RepoRoot"
    }

    $currentBranch = Get-GitOutput -Arguments @("branch", "--show-current")
    if ([string]::IsNullOrWhiteSpace($currentBranch)) {
        throw "无法识别当前分支，请确认仓库状态正常。"
    }

    if ($currentBranch -ne $Branch) {
        throw "当前分支是 $currentBranch，目标发布分支是 $Branch。请先切换到 $Branch 后再执行脚本。"
    }

    $remoteExists = Get-GitOutput -Arguments @("remote")
    if (-not (($remoteExists -split "\r?\n") -contains $Remote)) {
        throw "未找到 Git 远端 $Remote。"
    }
}

function Ensure-FrontendDependencies {
    if ($SkipInstall) {
        return
    }

    $nodeModulesDir = Join-Path $script:FrontendDir "node_modules"
    if (Test-Path $nodeModulesDir) {
        Write-Step "frontend 依赖已存在，跳过 npm install"
        return
    }

    Write-Step "安装 frontend 依赖"
    Push-Location $script:FrontendDir
    try {
        Invoke-CheckedCommand -ScriptBlock { npm install } -ErrorMessage "npm install 失败"
    }
    finally {
        Pop-Location
    }
}

function Run-NotionSync {
    Write-Step "执行 Notion 内容同步"
    Push-Location $script:FrontendDir
    try {
        Invoke-CheckedCommand -ScriptBlock { npm run sync } -ErrorMessage "npm run sync 失败"
    }
    finally {
        Pop-Location
    }
}

function Stage-SyncOutputs {
    Write-Step "暂存同步生成的内容"
    Push-Location $script:RepoRoot
    try {
        $stageablePaths = @($script:TrackedPaths | Where-Object { Test-Path (Join-Path $script:RepoRoot $_) })
        if ($stageablePaths.Count -eq 0) {
            throw "未找到可暂存的同步产物目录。"
        }

        # 只暂存同步产物，避免把仓库里其他未完成改动一起提交。
        Invoke-CheckedCommand -ScriptBlock { git add -- $stageablePaths } -ErrorMessage "git add 失败"
    }
    finally {
        Pop-Location
    }
}

function Has-StagedChanges {
    Push-Location $script:RepoRoot
    try {
        & git diff --cached --quiet
        return $LASTEXITCODE -ne 0
    }
    finally {
        Pop-Location
    }
}

function Commit-SyncOutputs {
    if (-not (Has-StagedChanges)) {
        Write-Step "没有检测到可提交的同步结果"
        return $false
    }

    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $script:CommitMessage = "chore: sync website content from Notion ($timestamp)"
    }

    Write-Step "提交同步结果"
    Push-Location $script:RepoRoot
    try {
        Invoke-CheckedCommand -ScriptBlock { git commit -m $script:CommitMessage } -ErrorMessage "git commit 失败"
    }
    finally {
        Pop-Location
    }

    return $true
}

function Push-Branch {
    if ($NoPush) {
        Write-Step "已按参数跳过 git push"
        return
    }

    Write-Step "推送到 $Remote/$Branch"
    Push-Location $script:RepoRoot
    try {
        Invoke-CheckedCommand -ScriptBlock { git push $Remote $Branch } -ErrorMessage "git push 失败"
    }
    finally {
        Pop-Location
    }
}

function Main {
    if (-not (Test-CommandExists "git")) {
        throw "未检测到 git，请先安装并加入 PATH。"
    }

    if (-not (Test-CommandExists "npm")) {
        throw "未检测到 npm，请先安装 Node.js。"
    }

    Ensure-RequiredEnvironment
    Ensure-RepositoryState
    Ensure-FrontendDependencies
    Run-NotionSync
    Stage-SyncOutputs

    $committed = Commit-SyncOutputs
    if ($committed) {
        Push-Branch
        Write-Step "发布完成"
    }
    else {
        Write-Step "同步完成，内容无变化，无需推送"
    }
}

Main


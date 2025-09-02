# 宠物权限管理测试运行脚本 (PowerShell)
# 使用方法: .\run-pet-permissions-tests.ps1 [命令] [选项]

param(
    [string]$Command = "run",
    [string]$Suite = "",
    [switch]$Headed,
    [switch]$Debug,
    [string]$Env = "development",
    [switch]$Help
)

# 显示帮助信息
function Show-Help {
    Write-Host @"

🔐 宠物权限管理测试运行器

用法:
  .\run-pet-permissions-tests.ps1 [命令] [选项]

命令:
  run                运行所有宠物权限测试 (默认)
  suite <name>       运行特定测试套件
  performance        运行性能测试
  cleanup [type]     清理测试数据
  help               显示帮助信息

测试套件:
  access             宠物访问权限测试
  sharing            宠物共享功能测试
  multi-user         多用户宠物管理权限测试
  privacy            宠物数据隐私保护测试
  security           权限边界测试

选项:
  -Headed            在有头模式下运行测试
  -Debug             启用调试模式
  -Env <env>         设置测试环境 (development|staging)
  -Help              显示帮助信息

示例:
  .\run-pet-permissions-tests.ps1
  .\run-pet-permissions-tests.ps1 suite access
  .\run-pet-permissions-tests.ps1 performance -Headed
  .\run-pet-permissions-tests.ps1 cleanup quick

"@ -ForegroundColor Cyan
}

# 检查是否在正确的目录
function Test-ProjectDirectory {
    if (-not (Test-Path "frontend\e2e\run-pet-permissions-tests.cjs")) {
        Write-Host "❌ 错误: 请在项目根目录运行此脚本" -ForegroundColor Red
        Write-Host "当前目录: $(Get-Location)" -ForegroundColor Yellow
        Write-Host "期望找到: frontend\e2e\run-pet-permissions-tests.cjs" -ForegroundColor Yellow
        exit 1
    }
}

# 构建命令选项
function Build-Options {
    $options = @()
    
    if ($Headed) { $options += "--headed" }
    if ($Debug) { $options += "--debug" }
    if ($Env -ne "development") { $options += "--env", $Env }
    
    return $options -join " "
}

# 执行测试命令
function Invoke-TestCommand {
    param(
        [string]$TestCommand,
        [string]$Options
    )
    
    try {
        Push-Location "frontend"
        
        $fullCommand = "node e2e\run-pet-permissions-tests.cjs $TestCommand $Options"
        Write-Host "执行命令: $fullCommand" -ForegroundColor Gray
        
        Invoke-Expression $fullCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ 操作完成!" -ForegroundColor Green
        } else {
            Write-Host "`n❌ 操作失败!" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    }
    catch {
        Write-Host "❌ 执行失败: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    finally {
        Pop-Location
    }
}

# 主函数
function Main {
    Write-Host "🔐 宠物权限管理测试运行器`n" -ForegroundColor Cyan
    
    if ($Help) {
        Show-Help
        return
    }
    
    # 检查项目目录
    Test-ProjectDirectory
    
    # 构建选项
    $options = Build-Options
    
    # 根据命令执行相应操作
    switch ($Command.ToLower()) {
        "run" {
            Write-Host "🚀 运行所有宠物权限测试..." -ForegroundColor Yellow
            Invoke-TestCommand "run" $options
        }
        "suite" {
            if ([string]::IsNullOrEmpty($Suite)) {
                Write-Host "❌ 错误: 请指定测试套件名称" -ForegroundColor Red
                Write-Host "可用套件: access, sharing, multi-user, privacy, security" -ForegroundColor Yellow
                exit 1
            }
            Write-Host "🎯 运行测试套件: $Suite" -ForegroundColor Yellow
            Invoke-TestCommand "suite $Suite" $options
        }
        "performance" {
            Write-Host "⚡ 运行性能测试..." -ForegroundColor Yellow
            Invoke-TestCommand "performance" $options
        }
        "cleanup" {
            Write-Host "🧹 清理测试数据..." -ForegroundColor Yellow
            $cleanupType = if ($Suite) { $Suite } else { "full" }
            
            try {
                Push-Location "frontend"
                $cleanupCommand = "node e2e\utils\cleanup-test-data.js $cleanupType"
                Write-Host "执行命令: $cleanupCommand" -ForegroundColor Gray
                Invoke-Expression $cleanupCommand
            }
            finally {
                Pop-Location
            }
        }
        "help" {
            Show-Help
        }
        default {
            Write-Host "❌ 未知命令: $Command" -ForegroundColor Red
            Show-Help
            exit 1
        }
    }
}

# 错误处理
trap {
    Write-Host "❌ 发生未处理的错误: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 运行主函数
Main
@echo off
REM 宠物权限管理测试运行脚本 (Windows)
REM 使用方法: run-pet-permissions-tests.bat [命令] [选项]

setlocal enabledelayedexpansion

REM 检查是否在正确的目录
if not exist "frontend\e2e\run-pet-permissions-tests.cjs" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    echo 当前目录: %CD%
    echo 期望找到: frontend\e2e\run-pet-permissions-tests.cjs
    pause
    exit /b 1
)

REM 解析命令行参数
set "COMMAND=%1"
set "SUITE=%2"
set "OPTIONS=%3 %4 %5 %6 %7 %8 %9"

REM 如果没有提供命令，默认为 run
if "%COMMAND%"=="" set "COMMAND=run"

echo 🔐 宠物权限管理测试运行器
echo.

REM 根据命令执行相应操作
if "%COMMAND%"=="run" (
    echo 🚀 运行所有宠物权限测试...
    cd frontend
    node e2e\run-pet-permissions-tests.cjs %OPTIONS%
    cd ..
) else if "%COMMAND%"=="suite" (
    if "%SUITE%"=="" (
        echo ❌ 错误: 请指定测试套件名称
        echo 可用套件: access, sharing, multi-user, privacy, security
        pause
        exit /b 1
    )
    echo 🎯 运行测试套件: %SUITE%
    cd frontend
    node e2e\run-pet-permissions-tests.cjs suite %SUITE% %OPTIONS%
    cd ..
) else if "%COMMAND%"=="performance" (
    echo ⚡ 运行性能测试...
    cd frontend
    node e2e\run-pet-permissions-tests.cjs performance %OPTIONS%
    cd ..
) else if "%COMMAND%"=="cleanup" (
    echo 🧹 清理测试数据...
    cd frontend
    node e2e\utils\cleanup-test-data.js %SUITE%
    cd ..
) else if "%COMMAND%"=="help" (
    goto :show_help
) else (
    echo ❌ 未知命令: %COMMAND%
    goto :show_help
)

echo.
echo ✅ 操作完成!
pause
exit /b 0

:show_help
echo.
echo 🔐 宠物权限管理测试运行器
echo.
echo 用法:
echo   run-pet-permissions-tests.bat [命令] [选项]
echo.
echo 命令:
echo   run                运行所有宠物权限测试 (默认)
echo   suite ^<name^>       运行特定测试套件
echo   performance        运行性能测试
echo   cleanup [type]     清理测试数据
echo   help               显示帮助信息
echo.
echo 测试套件:
echo   access             宠物访问权限测试
echo   sharing            宠物共享功能测试
echo   multi-user         多用户宠物管理权限测试
echo   privacy            宠物数据隐私保护测试
echo   security           权限边界测试
echo.
echo 清理类型:
echo   full               完整清理 (默认)
echo   quick              快速清理
echo   reset              重置数据库
echo.
echo 选项:
echo   --env ^<env^>        设置测试环境 (development^|staging)
echo   --headed           在有头模式下运行测试
echo   --debug            启用调试模式
echo.
echo 示例:
echo   run-pet-permissions-tests.bat
echo   run-pet-permissions-tests.bat suite access
echo   run-pet-permissions-tests.bat performance --headed
echo   run-pet-permissions-tests.bat cleanup quick
echo.
pause
exit /b 0
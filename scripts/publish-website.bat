@echo off
setlocal

REM 保证从脚本所在目录启动，避免双击时工作目录不正确。
cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File ".\scripts\publish-website.ps1"

if errorlevel 1 (
    echo.
    echo 发布失败，请查看上方日志。
    pause
    exit /b 1
)

echo.
echo 发布完成，按任意键关闭窗口。
pause >nul

@echo off
setlocal EnableExtensions
title Notion Notes Sync and GitHub Pages Publish

set "REPO_ROOT=%~dp0"
set "NO_PAUSE=0"
set "VALIDATE_ONLY=0"
set "EXIT_CODE=0"

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--no-pause" set "NO_PAUSE=1"
if /I "%~1"=="--validate-only" set "VALIDATE_ONLY=1"
shift
goto parse_args

:args_done

pushd "%REPO_ROOT%" >nul 2>&1
if errorlevel 1 goto path_error

echo.
echo ============================================================
echo   Notion Notes Sync and GitHub Pages Publish
echo ============================================================
echo.

where powershell.exe >nul 2>&1
if errorlevel 1 goto powershell_error

if "%VALIDATE_ONLY%"=="1" (
    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%scripts\publish-website.ps1" -ValidateOnly
) else (
    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%scripts\publish-website.ps1"
)
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" goto failed

echo.
if "%VALIDATE_ONLY%"=="1" echo [SUCCESS] Validation completed. No files were changed or pushed.
if "%VALIDATE_ONLY%"=="0" echo [SUCCESS] Notion sync and GitHub Pages push completed.
echo [SITE] https://yestinma.github.io/personal-website/
echo.
goto finish

:path_error
set "EXIT_CODE=1"
echo [ERROR] Cannot open repository directory:
echo %REPO_ROOT%
goto failed_no_popd

:powershell_error
set "EXIT_CODE=1"
echo [ERROR] powershell.exe was not found in PATH.
goto failed

:failed
echo.
echo [FAILED] Sync or publish failed. Review the error above.
echo [LOG] %REPO_ROOT%scripts\last-publish-error.log
echo.
popd >nul 2>&1
goto end

:failed_no_popd
echo.
echo [FAILED] Unable to start the publish workflow.
echo.
goto end

:finish
popd >nul 2>&1

:end
if "%NO_PAUSE%"=="0" pause
exit /b %EXIT_CODE%

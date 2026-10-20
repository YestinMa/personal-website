@echo off
setlocal EnableExtensions
call "%~dp0..\sync-notion-and-publish.bat" %*
exit /b %ERRORLEVEL%

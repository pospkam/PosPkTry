@echo off
echo ========================================
echo   AUTO DEPLOY KAMHUB
echo ========================================
echo.

REM Создаем SSH команду
set SERVER=5.129.248.224
set USER=root
set PASSWORD=xQvB1pv?yZTjaR

echo Попытка подключения к серверу...
echo.

REM Создаем PowerShell скрипт для автоматизации
powershell -Command "$pw = ConvertTo-SecureString 'xQvB1pv?yZTjaR' -AsPlainText -Force; $cred = New-Object System.Management.Automation.PSCredential ('root', $pw); Invoke-Command -ComputerName 5.129.248.224 -Credential $cred -ScriptBlock { apt-get update }"

pause




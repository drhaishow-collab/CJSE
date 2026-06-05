@echo off
setlocal EnableDelayedExpansion
title CJ MarketBoard Dev Runner
echo ==========================================
echo       CJ MarketBoard Development Runner
echo ==========================================
echo.

set "ROOT=%~dp0"
set "NODE_DIR=D:\Data_Hub\node-env"
set "PATH=%NODE_DIR%;%PATH%"

:: --- Pre-flight checks ---
if not exist "%NODE_DIR%\node.exe" (
    echo [ERROR] Khong tim thay Node.js tai %NODE_DIR%
    echo         Cai dat Node hoac cap nhat duong dan NODE_DIR trong start.bat
    pause
    exit /b 1
)

if not exist "%ROOT%backend\node_modules\" (
    echo [ERROR] Thieu backend\node_modules. Chay: cd backend ^&^& npm install
    pause
    exit /b 1
)

if not exist "%ROOT%frontend\node_modules\" (
    echo [ERROR] Thieu frontend\node_modules. Chay: cd frontend ^&^& npm install
    pause
    exit /b 1
)

if not exist "%ROOT%backend\.env" (
    echo [WARN] Khong thay backend\.env - backend co the dung cau hinh mac dinh
)

:: --- [1/3] PostgreSQL (bat buoc cho API / bao cao) ---
echo [1/3] Kiem tra PostgreSQL (port 5432)...
set "PG_SERVICE="
for %%s in (postgresql-x64-16 postgresql-x64-15 postgresql-x64-14 postgresql-x64-13) do (
    sc query "%%s" >nul 2>&1
    if !errorlevel! equ 0 set "PG_SERVICE=%%s"
)

if defined PG_SERVICE (
    sc query "!PG_SERVICE!" | findstr /i "RUNNING" >nul
    if !errorlevel! neq 0 (
        echo       Dang khoi dong service !PG_SERVICE!...
        net start "!PG_SERVICE!" >nul 2>&1
        if !errorlevel! neq 0 (
            echo [WARN] Khong the start !PG_SERVICE! tu dong. Hay mo Services va start thu cong.
        ) else (
            echo       OK - !PG_SERVICE! da chay
        )
    ) else (
        echo       OK - !PG_SERVICE! dang chay
    )
) else (
    netstat -ano | findstr ":5432" | findstr "LISTENING" >nul
    if !errorlevel! equ 0 (
        echo       OK - co process lang nghe port 5432
    ) else (
        echo [WARN] Khong thay PostgreSQL service / port 5432. API co the fallback mock data.
    )
)

:: --- [2/3] Backend API ---
echo [2/3] Starting Backend API (port 3001)...
start "MarketBoard Backend API" cmd /k "cd /d %ROOT%backend && set PATH=%NODE_DIR%;%%PATH%% && npm run dev"

:: --- [3/3] Frontend Vite ---
echo [3/3] Starting Frontend Vite (port 5173)...
start "MarketBoard Frontend App" cmd /k "cd /d %ROOT%frontend && set PATH=%NODE_DIR%;%%PATH%% && npm run dev"

echo.
echo ==========================================
echo Da mo 2 cua so terminal (Backend + Frontend).
echo Doi ~10 giay roi mo trinh duyet:
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:3001/api/status
echo   Database:  sales_db @ localhost:5432
echo ==========================================

:: Optional: pgAdmin 4
set "PGADMIN_PATH="
for /d %%d in ("C:\Program Files\pgAdmin 4\*") do (
    if exist "%%d\runtime\pgAdmin4.exe" set "PGADMIN_PATH=%%d\runtime\pgAdmin4.exe"
    if exist "%%d\bin\pgAdmin4.exe" set "PGADMIN_PATH=%%d\bin\pgAdmin4.exe"
)

if not "!PGADMIN_PATH!"=="" (
    echo.
    set /p choice="Mo pgAdmin 4 de quan ly DB? (Y/N): "
    if /i "!choice!"=="Y" start "" "!PGADMIN_PATH!"
)

echo.
pause

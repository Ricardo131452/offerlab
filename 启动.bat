@echo off
chcp 65001 >nul
cd /d "%~dp0"
title OfferLab

if not exist node_modules (
  echo [1/2] 首次启动，安装依赖（约 1-2 分钟，只做一次）...
  call npm install
  if errorlevel 1 (
    echo 依赖安装失败，检查网络或 Node 版本（需要 Node 18+）
    pause
    exit /b 1
  )
)

echo [2/2] 启动 OfferLab ...
start "" http://localhost:3000
call npm run dev
pause

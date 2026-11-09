@echo off
rem Inicia o agente de impressao. Se cair, tenta de novo em 5 segundos.
cd /d "%~dp0"
:inicio
node agente.mjs
timeout /t 5 /nobreak >nul
goto inicio

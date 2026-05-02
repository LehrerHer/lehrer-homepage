@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
color 0B

echo.
echo  =============================================
echo   Lehrer-Homepage  ^|  Merge + Deploy
echo  =============================================
echo.

:: In den Projektordner wechseln (wo diese .bat liegt)
cd /d "%~dp0"

:: ── 1. Remote-Stand holen ────────────────────────────────────────
echo  [1/5]  Fetch von GitHub...
git fetch origin
if %errorlevel% neq 0 goto :fehler
echo         OK
echo.

:: ── 2. Lokalen main aktualisieren ───────────────────────────────
echo  [2/5]  Lokalen Stand aktualisieren (rebase)...
git rebase origin/main
if %errorlevel% neq 0 (
    echo.
    echo  KONFLIKT beim Rebase.
    echo  Bitte in einem anderen Fenster manuell loesen:
    echo    git rebase --continue   oder
    echo    git rebase --abort
    goto :pause_end
)
echo         OK
echo.

:: ── 3. Ungemergete Claude-Branches einmergen ────────────────────
echo  [3/5]  Claude-Branches suchen...
set ANZAHL=0

for /f "tokens=*" %%B in ('git branch -r --no-merged HEAD 2^>nul ^| findstr /C:"claude/"') do (
    set BR=%%B
    :: fuehrende Leerzeichen entfernen
    set BR=!BR: =!
    echo         Merge: !BR!
    git merge !BR! --no-edit --no-ff
    if !errorlevel! neq 0 (
        echo.
        echo  FEHLER beim Merge von !BR!
        goto :fehler
    )
    set /a ANZAHL+=1
)

if !ANZAHL!==0 (
    echo         Keine neuen Claude-Branches gefunden – nichts zu mergen.
) else (
    echo         !ANZAHL! Branch(es) gemergt.
)
echo.

:: ── 4. Push zu GitHub ───────────────────────────────────────────
echo  [4/5]  Push zu GitHub (main)...
git push origin main
if %errorlevel% neq 0 goto :fehler
echo         OK
echo.

:: ── 5. Deploy auf lehrer-herrmann.de ───────────────────────────
echo  [5/5]  Deploy auf lehrer-herrmann.de...
ssh root@178.105.35.83 "cd /var/www/lehrer-homepage && git pull && pm2 restart kolosseum"
if %errorlevel% neq 0 (
    echo.
    echo  WARNUNG: SSH-Verbindung fehlgeschlagen.
    echo  Manuell deployen:
    echo    ssh root@178.105.35.83 "cd /var/www/lehrer-homepage ^&^& git pull ^&^& pm2 restart kolosseum"
) else (
    echo         OK
)

echo.
echo  =============================================
echo   Fertig! Alles ist live auf lehrer-herrmann.de
echo  =============================================
echo.
goto :pause_end

:fehler
echo.
color 0C
echo  =============================================
echo   FEHLER – bitte Ausgabe oben pruefen.
echo  =============================================
echo.

:pause_end
pause
endlocal

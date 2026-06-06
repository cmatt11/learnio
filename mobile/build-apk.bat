@echo off
REM ===========================================================================
REM  Learnio - one-click Android APK builder / updater (Windows)
REM
REM  Double-click this file, or run it from a terminal inside the mobile folder.
REM  It works for BOTH the first build and later updates:
REM    - installs/updates dependencies
REM    - copies the latest web app into www
REM    - creates the Android project the first time (skips it afterwards)
REM    - regenerates the app icon + splash
REM    - builds the debug APK and opens the folder it lands in
REM
REM  Requirements (one-time setup): Node.js 18+, Java JDK 17, Android Studio
REM  (for the Android SDK). See BUILD_APK.md for details.
REM ===========================================================================

setlocal
cd /d "%~dp0"

echo ==================================================
echo   Learnio - build / update the Android APK
echo ==================================================
echo.

echo [1/6] Installing dependencies (npm install)...
call npm install || goto :error

echo.
echo [2/6] Copying the latest web app into www...
call npm run build:www || goto :error

if not exist "android" (
  echo.
  echo [3/6] First run detected - creating the Android project...
  call npx cap add android || goto :error
) else (
  echo.
  echo [3/6] Android project already exists - skipping create.
)

echo.
echo [4/6] Syncing Capacitor...
call npx cap sync android || goto :error

echo.
echo [5/6] Generating app icon + splash ^(optional^)...
call npm run gen:assets
call npx capacitor-assets generate --android

echo.
echo [6/6] Building the APK ^(this can take a few minutes^)...
cd android
call gradlew.bat assembleDebug || goto :error
cd ..

echo.
echo ==================================================
echo   BUILD SUCCESSFUL
echo.
echo   Your APK is here:
echo   %~dp0android\app\build\outputs\apk\debug\app-debug.apk
echo ==================================================
echo.
echo Opening the folder...
start "" "%~dp0android\app\build\outputs\apk\debug"
goto :end

:error
echo.
echo ==================================================
echo   BUILD FAILED - scroll up to read the error.
echo.
echo   Most common fixes:
echo     * Java 17 must be active.   Check with:  java -version
echo     * The Android SDK path must be set in:
echo       android\local.properties
echo ==================================================

:end
echo.
pause
endlocal

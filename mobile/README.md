# Learnio for Android (Capacitor)

This folder packages the Learnio web app into a native Android APK using
[Capacitor](https://capacitorjs.com/). The web assets are bundled **inside** the
APK, so the installed app works fully offline and stores all data locally on the
device (via the WebView's `localStorage`).

## Easiest way: build in the cloud (no setup)

A GitHub Actions workflow builds the APK for you:

1. Go to the repo's **Actions** tab on GitHub.
2. Select **Build Android APK** → **Run workflow**.
3. When it finishes, download the **learnio-debug-apk** artifact.
4. Copy `app-debug.apk` to your phone and install it (you may need to allow
   "Install unknown apps" for your browser/file manager).

Pushing a tag like `v1.0.0` also builds the APK and attaches it to a GitHub
Release automatically.

## Build locally

Requirements: Node 18+, JDK 17, and the Android SDK (e.g. via Android Studio).

```bash
cd mobile
npm install
npm run build:www      # copy the web app into www/
npx cap add android    # first time only - creates the android/ project
npx cap sync android
npm run gen:assets                 # render PNG icons/splash from the SVGs
npx capacitor-assets generate --android   # apply icons to the Android project
cd android && ./gradlew assembleDebug
```

The APK is written to:

```
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

To run on a connected device/emulator during development:

```bash
npx cap run android
```

## Notes

- **App ID / name** live in `capacitor.config.json` (`dev.learnio.app` / "Learnio").
- `build:www` re-copies the latest web app; re-run it (and `npx cap sync`) after
  changing anything in the web app, then rebuild.
- `www/`, `android/`, `assets/`, and `node_modules/` are generated and git-ignored.
- This produces a **debug** APK (self-signed, fine for personal use/sideloading).
  For Play Store distribution you'd generate a signed **release** build with your
  own keystore.

## Where is my data stored?

All Learnio data is kept in the WebView's `localStorage`, which Android stores in
the app's private data directory on the device. Nothing is sent to a server.
Uninstalling the app clears it, so use **Settings → Export JSON** in the app to
back up.

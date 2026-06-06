# Learnio for Android (Capacitor)

This folder packages the Learnio web app into a native Android APK using
[Capacitor](https://capacitorjs.com/). The web assets are bundled **inside** the
APK, so the installed app works fully offline and stores all data locally on the
device (via the WebView's `localStorage`).

## Easiest way: download from Releases (no setup)

Every time the app changes on `main` (or you run the workflow manually), GitHub
Actions builds the APK and publishes it to the repo's **Releases** page:

1. Open the repo on GitHub → **Releases** (right sidebar), or go to
   `https://github.com/cmatt11/learnio/releases`.
2. Open **"Learnio Android (latest build)"**.
3. Download **`learnio.apk`** under *Assets* and install it on your phone
   (you may need to allow "Install unknown apps" for your browser/file manager).

You can also trigger a build on demand: **Actions** tab → **Build Android APK**
→ **Run workflow**. Tagging a commit `vX.Y.Z` creates a permanent named release
with the APK attached.

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

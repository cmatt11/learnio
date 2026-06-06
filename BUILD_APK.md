# Build the Learnio Android APK yourself

This guide walks you through building a **real, offline Android app** from this
repo using [Capacitor](https://capacitorjs.com/). Everything in the `mobile/`
folder is already set up — you just run a few commands on your computer.

The finished APK bundles the whole app, works offline, and stores all data
locally on the phone.

---

## 1. Install the tools (one time, ~20–30 min)

| Tool | What it's for | Download |
|------|----------------|----------|
| **Node.js 18+** | Runs the build scripts | https://nodejs.org (pick "LTS") |
| **Java JDK 17** | Required to compile Android | https://adoptium.net (Temurin 17) |
| **Android Studio** | Provides the Android SDK that builds the APK | https://developer.android.com/studio |

After installing Android Studio, **open it once** and let it finish downloading
the default **Android SDK** components. You don't need to write any code in it —
it just provides the build tools.

> Tip: When Android Studio finishes setup, you can close it. The SDK it installed
> stays on your machine.

### Check the installs worked

Open a terminal (Command Prompt/PowerShell on Windows, Terminal on Mac/Linux):

```bash
node --version    # should print v18.x or higher
java -version     # should mention version 17
```

---

## 2. Get the project files

Download this repo to your computer:

- On the GitHub repo page: click the green **Code** button → **Download ZIP**,
  then unzip it.
- _or_ if you have git: `git clone https://github.com/cmatt11/learnio.git`

---

## 3. Build the APK

Open a terminal **inside the `mobile` folder** of the project, then run these
commands **one at a time**:

```bash
npm install                          # install Capacitor & build tools
npm run build:www                    # copy the web app into mobile/www
npx cap add android                  # create the native Android project (first time only)
npx cap sync android                 # copy the app into the Android project
npm run gen:assets                   # render app icon + splash from the SVGs
npx capacitor-assets generate --android   # apply those icons to the project
```

Now compile the APK:

**Mac / Linux:**
```bash
cd android
./gradlew assembleDebug
```

**Windows:**
```bash
cd android
gradlew.bat assembleDebug
```

The first compile downloads some Android dependencies, so give it a few minutes.

---

## 4. Find your APK

When the build finishes, the file is here:

```
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Install it on your phone

1. Copy `app-debug.apk` to your phone (USB, Google Drive, email to yourself, etc.).
2. Tap the file on your phone.
3. Android will warn about "unknown sources" — allow installing from your file
   manager/browser, then confirm.
4. Learnio appears in your app drawer. All your data stays on the device.

---

## Prefer a button-click build? (Android Studio GUI)

After running the `npm ...` and `npx cap ...` commands in step 3 (you can stop
before the `gradlew` step):

1. Open **Android Studio** → **Open** → select the `mobile/android` folder.
2. Wait for it to finish "Gradle sync" (bottom status bar).
3. Menu: **Build ▸ Build Bundle(s) / APK(s) ▸ Build APK(s)**.
4. When done, a notification appears with a **locate** link to the APK.

---

## Attach the APK to GitHub (so others can download it)

1. On the repo homepage, click **Releases** (right sidebar).
2. Click **Draft a new release** (or **Create a new release**).
3. Choose a tag like `v1.0.0` and add a title (e.g. "Learnio v1").
4. **Drag your `app-debug.apk` into the "Attach binaries" box.**
5. Click **Publish release**. The APK is now downloadable from your Releases page.

---

## Updating the app later

When you change the web app, just rebuild:

```bash
cd mobile
npm run build:www
npx cap sync android
cd android && ./gradlew assembleDebug   # (gradlew.bat on Windows)
```

---

## Troubleshooting

- **`gradlew: command not found` / permission denied (Mac/Linux):**
  run `chmod +x gradlew` inside `mobile/android`, then retry.
- **"SDK location not found" / licenses not accepted:**
  open Android Studio once and finish the initial SDK setup, then rebuild.
  You can also accept licenses with `sdkmanager --licenses`.
- **"Unsupported class file major version" / Java errors:**
  make sure JDK **17** is the active Java (`java -version`). Capacitor 6 needs 17.
- **`npx cap add android` says android already exists:**
  that's fine — skip it and just run `npx cap sync android`.
- **Build still fails:** copy the last ~20 lines of the error and ask, and the
  exact fix can be provided.

---

For more detail on the Capacitor wrapper itself, see
[`mobile/README.md`](mobile/README.md).

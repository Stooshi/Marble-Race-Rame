# Run Marble Spins on your own phone

These steps put the real Marble Spins app on your own phone, connected to the live game
server. No App Store or Google Play account is needed. You do the setup once; after that,
getting the latest version takes about a minute (see "Getting the latest version").

What you need:
- **Android:** your Windows PC or your Mac, your Android phone and a USB cable that carries data
  (not just charging).
- **iPhone:** a Mac, your iPhone, a cable and your normal Apple ID.

On a Mac, do "Mac: one-time setup for both apps" first. The second half of this guide,
"Releasing a new version", says how to send the apps to Google Play and the App Store, and
"When something fails" has the usual fixes.

---

## Mac: one-time setup for both apps (1–2 hours, mostly downloads)

1. **Install Xcode** from the Mac App Store (free, very large).
   1. Open it once and accept the terms.
   2. If it asks which platforms to install, tick **iOS**.
   3. If Xcode was already installed: open **Xcode → Settings… → Locations** and check that
      **Command Line Tools** shows your Xcode version (not empty).
2. **Install Node.js:** https://nodejs.org. Choose the "LTS" version and the macOS installer.
3. **Install Android Studio:** https://developer.android.com/studio. Choose the Mac version for
   your chip (Apple chip or Intel; see the Apple menu → **About This Mac**). Drag it to **Applications**.
   Open it, choose **Standard** setup, and click **Next** and **Finish** until it has downloaded
   everything.
4. **CocoaPods is not needed.** The iPhone project uses Swift Package Manager, which comes with
   Xcode.
5. **Get the game's code.** Open **Terminal** (Cmd+Space, type Terminal) and type these lines one
   at a time, pressing Enter after each:
   ```
   cd ~/Documents
   git clone https://github.com/Stooshi/Marble-Race-Rame.git
   cd Marble-Race-Rame/client
   npm install
   npm run app:sync
   ```
   At the end it prints "Done (build <date> UTC)". Always open the projects with `npx cap open
   android` / `npx cap open ios` from this same folder, so you run this build (the app's footer shows
   "Build <date> UTC · app": it should match).
   If the Mac offers to install "command line developer tools", click **Install**, then type the
   `git clone` line again. Sign in to GitHub if asked.
6. **Open the Android project once**, so Android Studio downloads what it needs: type
   `npx cap open android` and wait until "Gradle sync" at the bottom has finished (3–10 minutes).

Then follow "Run the app" in the Android section (the steps are the same on a Mac; use Terminal
instead of Command Prompt) and the iPhone section from step 4 ("Add your Apple ID to Xcode").

---

## Android: from your Windows PC

### One-time setup (about 45 minutes, mostly downloads)

1. **Install three programs.** Accept the default choices in each installer.
   - **Node.js:** https://nodejs.org. Choose the "LTS" version.
   - **Git:** https://git-scm.com/download/win
   - **Android Studio:** https://developer.android.com/studio. When it opens for the first time,
     choose **Standard** setup, then click **Next** and **Finish** until it has downloaded
     everything (10–20 minutes).
2. **Get the game's code.**
   1. Press the Windows key, type `cmd` and open **Command Prompt**.
   2. Type these lines one at a time, pressing Enter after each:
      ```
      cd %USERPROFILE%\Documents
      git clone https://github.com/Stooshi/Marble-Race-Rame.git
      cd Marble-Race-Rame\client
      npm install
      npm run app:sync
      ```
      If a GitHub login window appears, sign in. The last two lines take a few minutes, and the
      last one ends with "Done."
3. **Turn on "USB debugging" on your phone.**
   1. Open **Settings → About phone**. On Samsung phones it is **Settings → About phone →
      Software information**.
   2. Tap **Build number** 7 times, until the phone says "You are now a developer". Enter your PIN
      if it asks.
   3. Go back to **Settings**, open **Developer options** (often under **System**) and turn on
      **USB debugging**.
4. **Connect the phone to the PC with the cable.**
   - A message on the phone asks **"Allow USB debugging?"**. Tick **Always allow from this
     computer** and tap **Allow**.
   - If no message appears, pull down the notification shade, tap the USB notification and choose
     **File transfer**.

### Run the app

1. Back in Command Prompt, in the same folder, type: `npx cap open android`. Android Studio opens
   the app.
2. **The first time only:** wait until the progress bar at the bottom ("Gradle sync") has finished.
   This takes 3–10 minutes. If Android Studio offers to install something that is missing, click
   it and accept.
3. At the top of the window, the device menu shows your phone's name. If it shows something else,
   pick your phone from the list.
4. Click the green **▶ Run** button. After a minute, Marble Spins opens on your phone. It stays
   installed like any other app, and you can unplug the cable.

**If your phone doesn't appear in the menu:** unplug and replug the cable, check the "Allow USB
debugging" message on the phone, and try another cable or USB port. For Samsung phones, install
the "Samsung USB driver" from Samsung's website.

---

## iPhone: from your Mac (a free Apple ID is enough)

### One-time setup (1–2 hours, mostly the Xcode download)

1. **Install Xcode** from the Mac App Store. It's free and very large.
   1. Open it once and accept the terms.
   2. If it asks which platforms to install, tick **iOS**.
2. **Install Node.js:** https://nodejs.org. Choose the "LTS" version and use the macOS installer.
3. **Get the game's code.**
   1. Open **Terminal** (press Cmd+Space and type Terminal).
   2. Type these lines one at a time, pressing Enter after each:
      ```
      cd ~/Documents
      git clone https://github.com/Stooshi/Marble-Race-Rame.git
      cd Marble-Race-Rame/client
      npm install
      npm run app:sync
      npx cap open ios
      ```
      If the Mac offers to install "command line developer tools", click **Install**, then type the
      `git clone` line again. Sign in to GitHub if asked. Xcode opens the app at the end.
4. **Add your Apple ID to Xcode.**
   1. In the menu bar, open **Xcode → Settings… → Accounts**.
   2. Click **+**, choose **Apple ID** and sign in. It appears as "Your Name (Personal Team)".
5. **Let Xcode sign the app.**
   1. In the left column, click the blue **App** icon at the top.
   2. In the middle, under **TARGETS**, click **App**, then open the **Signing & Capabilities** tab.
   3. Tick **Automatically manage signing** and set **Team** to "Your Name (Personal Team)".
   4. The Bundle Identifier shows `com.marblespins.app.dev`. That is correct for testing: the real
      `com.marblespins.app` stays free for the App Store later.
6. **Connect your iPhone with the cable.**
   1. Unlock the phone. When it asks **"Trust This Computer?"**, tap **Trust** and enter your
      passcode.
   2. **Turn on Developer Mode** (iOS 16 and later): on the iPhone go to **Settings → Privacy &
      Security → Developer Mode**, turn it on and let the phone restart. After the restart, tap
      **Turn On** and enter your passcode. If you don't see Developer Mode, run the app once
      (next section) and look again.

### Run the app

1. At the top of Xcode, click the device name next to "App" and pick **your iPhone**. The first
   time, Xcode may spend a few minutes "preparing" the phone; wait for it to finish.
2. Click **▶** (Run). If the Mac asks for your **login password** for "codesign", type it and click
   **Always Allow**.
3. **The first time only, trust yourself as a developer.** The iPhone may say "Untrusted
   Developer".
   1. On the iPhone go to **Settings → General → VPN & Device Management**.
   2. Tap your Apple ID under "Developer App", then tap **Trust**.
   3. Click ▶ in Xcode again. Marble Spins opens on your iPhone.

### The 7-day limit with a free Apple ID

- An app installed with a free Apple ID **stops opening after 7 days**. Nothing is lost: plug the
  iPhone in, open the project (`npx cap open ios` in the client folder) and click ▶ again. That
  renews it for another 7 days.
- A free Apple ID can have at most 3 test apps on a phone at once.
- Either of your two Macs works the same way. Do the one-time setup on the Mac you'll use; your
  Apple ID can be on both.
- The limit disappears once the paid Apple Developer account exists ($99/year). That account is
  also needed for TestFlight and the App Store.

---

## Getting the latest version (both phones)

In Command Prompt (Windows) or Terminal (Mac), type:

```
cd Documents/Marble-Race-Rame/client
git pull
npm install
npm run app:sync
```

On Windows, write the first line with backslashes: `cd Documents\Marble-Race-Rame\client`.

Then click ▶ Run again in Android Studio or Xcode.

---

## What to check on the phone

- **Icon and start screen:** the orange marble icon on the home screen; at start, the Marble Spins
  logo on night blue, which goes away as soon as the game shows.
- **Status bar:** the clock and battery icons at the top are light and readable over the game, and
  the header isn't hidden under them or under the camera notch.
- **Offline screen:** turn on flight mode, and the "You're offline" screen appears. Turn flight
  mode off, and the game comes back by itself.
- **Android only:** the back button goes back a page, and leaves the app from the home screen.
- **Sound:** music stops when you switch to another app or lock the phone, and resumes when you
  come back.
- **Smoothness:** during a race, tap the **FPS** button under the 3D view. A small counter shows
  frames per second and hold-ups (tap FPS again to hide it). Phones are capped
  at 60 frames a second; numbers from 45 to 60 are good. Note the numbers and the phone model for
  Claude if a race feels choppy.
- **Coin packs:** on the iPhone, buying coins says it isn't available in the app yet. On Android,
  purchases use Google Play Billing: test them in the build installed from Play's internal test
  track, signed in with your license-tester account (test cards, nothing charged). Release builds:
  `npm run android:key` once, then `npm run android:release` (docs/05-runbook.md).

---

# Releasing a new version

Do these steps in Terminal, in the `client` folder (`cd ~/Documents/Marble-Race-Rame/client`).
Get the latest code first: `git pull` and `npm install`.

Every upload to Google Play or the App Store needs a new **build number** (`versionCode`).
Players see the **version** (`versionName`, like 1.0.1). Both live in `client/app-version.json`,
and both apps read them from there.

## 1. Raise the version

1. Type `npm run app:version`. This raises 1.0.0 (build 1) to 1.0.1 (build 2).
   - For a bigger update: `npm run app:version -- minor` (1.0.1 → 1.1.0) or
     `npm run app:version -- major` (1.1.0 → 2.0.0).
   - For an exact version: `npm run app:version -- 1.2.0`.
   - Same version, only a new build (for example, Apple rejected the build):
     `npm run app:version -- build`.
2. It changes `app-version.json` (Android) and the iPhone project, and writes a release-notes
   draft. It prints two `git` lines at the end. Type them to save the new version:
   ```
   git add app-version.json ios/App/App.xcodeproj/project.pbxproj release-notes
   git commit -m "App 1.0.1 (2)"
   git push
   ```

## 2. Write the release notes

1. Open `client/release-notes/<version>.md` (for example `1.0.1.md`) in any text editor.
2. At the top, between the two "player text" lines, write what players will notice. Use short
   plain lines. Delete the lines that start with `[EDIT]`.
3. Below, "The commits" lists every change since the last release, grouped:
   - **Game and website:** players get these in the apps only with this update.
   - **Server:** already live for app players; no need to mention them.
   - Use the list as a reminder only. Commit messages are written for us, not for players.
4. Type `npm run app:notes`. It makes two files next to the draft:
   - `<version>.play.txt` for Google Play (at most 500 characters);
   - `<version>.appstore.txt` for the App Store (at most 4000 characters).
   If the text is too long or still has `[EDIT]` lines, it says so. Fix it and run it again.
5. Save them in git: `git add release-notes`, `git commit -m "Release notes 1.0.1"`, `git push`.

## 3. Android: build and upload to Google Play

**Once:** make the upload key with `npm run android:key` and back it up at once
(docs/05-runbook.md, "The upload key").

1. Type `npm run android:release`. Type the upload key password when it asks.
   - It refuses to build if this build number was already built. Then do step 1 first.
   - It takes 3–10 minutes. At the end it says "Signed bundle ready" and where the `.aab`
     file is (the `MarbleSpins-releases` folder in your home folder).
2. Open https://play.google.com/console and click **Marble Spins**.
3. In the left menu: **Test and release → Testing → Internal testing**.
4. Click **Create new release**.
5. Under **App bundles**, click **Upload** and choose the `.aab` from `MarbleSpins-releases`.
6. **Release name:** for example `1.0.1 (2)`.
7. **Release notes:** paste everything from `<version>.play.txt`, including the `<en-US>` lines.
8. Click **Next**. Errors must be fixed; warnings are fine. Click **Save and publish**.
9. On your phone, open the Play Store, find Marble Spins and tap **Update**. It can take up to an
   hour to appear.
10. When the internal test looks good: on the release, click **Promote release** and choose the
    next track (closed testing, then production).

The first upload ever has a few more steps: docs/05-runbook.md, "First upload: internal
testing".

## 4. iPhone: build and upload to TestFlight

**Once (needs the paid Apple Developer account, $99/year, for Voltron Robotics AB):**

1. **Find your Team ID.** Go to https://developer.apple.com/account, sign in, and open
   **Membership details**. Copy **Team ID** (10 letters and digits).
2. **Save it for the build script.** In Terminal, in the `client` folder, type (with your own ID):
   `echo ABCDE12345 > ios/apple-team-id.txt`. Git ignores this file.
3. **Sign in to Xcode with the company Apple ID:** **Xcode → Settings… → Accounts → + → Apple ID**.
4. **Make the app in App Store Connect.** Go to https://appstoreconnect.apple.com → **Apps** →
   **+** → **New App**.
   - Platforms: **iOS**. Name: **Marble Spins**. Primary language: **English (U.S.)**.
   - Bundle ID: **com.marblespins.app**. If it isn't in the list, register it first: on
     developer.apple.com → **Certificates, Identifiers & Profiles → Identifiers → +** →
     **App IDs** → **App**, Bundle ID "Explicit", `com.marblespins.app`. Tick **In-App
     Purchase**. Then start **New App** again.
   - SKU: `marblespins-ios`. User Access: **Full Access**. Click **Create**.

**Every release:**

1. Type `npm run ios:release`. It builds the game, then the iPhone app (5–15 minutes).
   - It refuses to build if this build number was already built. Then do step 1 first.
   - At the end it shows where the archive is (`MarbleSpins-releases` in your home folder).
2. **Upload with Xcode (the easy way):**
   1. In **Finder**, open your home folder → **MarbleSpins-releases**.
   2. Double-click `MarbleSpins-<version>-<build>.xcarchive`. Xcode's **Organizer** window opens
      with the archive selected. (Or open it in Xcode: **Window → Organizer → Archives**.)
   3. Click **Distribute App**.
   4. Choose **TestFlight & App Store** (older Xcode: **App Store Connect**), then click
      **Distribute**. Keep the suggested choices.
   5. Wait for "Uploaded". This takes a few minutes.
   - Instead of the Organizer, `npm run ios:release -- --upload` builds and uploads in one go.
3. **Add the release notes:** go to https://appstoreconnect.apple.com → **Apps → Marble Spins →
   TestFlight**. After 5–30 minutes the build shows there (Apple emails you). Click the build
   and paste `<version>.appstore.txt` into **What to Test**.
4. **Test it yourself, once:** in **TestFlight → Internal Testing**, click **+**, make a group
   "Marble Spins team" and add yourself. On the iPhone, install the **TestFlight** app from the
   App Store and open the invitation. Tap **Install**.
5. **To the App Store (when ready):** **Apps → Marble Spins → Distribution**, make the version
   (for example 1.0.1), paste `<version>.appstore.txt` into **What's New in This Version**,
   choose the build under **Build**, and click **Add for Review**.

## 5. Mark the release in git

When the upload worked, the release command prints one line like this. Type it:

```
git tag app-v1.0.1 && git push origin app-v1.0.1
```

The next release notes then start from this point. Tag once per version, after the first
upload (Android or iPhone, whichever comes first).

---

# When something fails

1. **"versionCode 2 already has a bundle" or "Build 2 was already made", or Google Play / App
   Store says the version code or build number is already used.**
   Run `npm run app:version` (or `npm run app:version -- build` to keep the same version), commit,
   and build again. Never built-but-not-uploaded? Add `-- --again`:
   `npm run android:release -- --again`.
2. **"xcodebuild requires Xcode, but active developer directory … is a command line tools
   instance", or "Xcode isn't ready".**
   Install Xcode from the App Store and open it once. Then type
   `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` and your Mac password.
3. **iPhone: "No Accounts", "No profiles for 'com.marblespins.app' were found", or "Signing
   for App requires a development team".**
   Open **Xcode → Settings… → Accounts** and sign in with the Apple ID of the paid team. Check
   that `ios/apple-team-id.txt` has the right Team ID. Check that the app exists in App Store
   Connect (step 4, "Once"). Then run `npm run ios:release -- --again`.
4. **Android: "Wrong password for the upload key", "No upload key yet", or Play says "signed
   with the wrong key".**
   Use the password from your password manager. If the key is missing, restore the
   `MarbleSpins-keys` folder from your backup into your home folder. Never make a second key;
   docs/05-runbook.md says how to reset a lost one.
5. **Android: "SDK location not found", "JAVA_HOME is not set" or "Java not found".**
   Open Android Studio once and let it finish its setup. Then type `npx cap open android` and
   wait until "Gradle sync" is done. Close Android Studio and run the command again.

Still stuck? Copy the last 30 lines of the Terminal window and send them to Claude.

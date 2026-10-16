# Run Marble Spins on your own phone

These steps put the real Marble Spins app on your own phone, connected to the live game
server. No App Store or Google Play account is needed. You do the setup once; after that,
getting the latest version takes about a minute (see "Getting the latest version").

What you need:
- **Android:** your Windows PC, your Android phone and a USB cable that carries data (not just
  charging).
- **iPhone:** a Mac, your iPhone, a cable and your normal Apple ID.

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

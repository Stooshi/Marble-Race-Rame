# Store rules: App Store and Google Play

What the stores' rules ask of Marble Spins, checked against the code on 21 October 2026 (app plan step 6). The proposed answers for the store forms (age rating, App Privacy, Data safety) are at the end, then the list of things only Moses can decide.

**Status:** OK = the app already complies. Fixed = changed in the code on 21 Oct 2026. Needs Moses = a decision or a store-console task.

**Sources** (read on 21 Oct 2026):
- Apple: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), "Last Updated: October 16, 2026". Age ratings: [App Store Connect Help, Age ratings](https://developer.apple.com/help/app-store-connect/reference/age-ratings).
- Google: [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111) and [Target audience and app content](https://support.google.com/googleplay/android-developer/answer/9867159) in the Play Console Help. The Families policy page (answer 9893335) could not be opened from the build workspace, so its rows below are from the Target audience page and the Developer Policy Center as last known; re-read it before submitting.

## How the apps are built (what the rules look at)

- Capacitor 8 wraps the same React client as the website. The pages are **bundled in the app** (`webDir: dist`, no `server.url`): the app does not load the website.
- Native parts: App Store / Google Play purchases (`@capgo/native-purchases`), Restore Purchases on iPhone, push notifications (built, switched off in `client/src/shared/push.json`), offline screen with the phone's own network status, Android back button, status bar and splash, sound that pauses in the background and follows the iPhone's silent switch. No haptics.
- No ads, no analytics or crash SDK in the apps. Google Analytics and the Meta Pixel load only on the website, after cookie consent (`client/src/site/consent/tracking.js` stops in the apps). The Android manifest removes `AD_ID`.
- Email and password accounts only. No Sign in with Apple or Google.
- Guests (any age) play without an account. Saving an account needs 13+ (birth year and month asked; under 13: no account, nothing stored). Coin packs and the pass are for saved accounts only.

## Account deletion

**In the apps:** Settings → **Delete my account** (`client/src/site/pages/SettingsPage.jsx`, `DeleteAccount`). Settings opens from the @name chip in the header (saved accounts), from the Marble Bag (everyone), and now from the footer of every page in the apps (fixed). The button shows for guests and saved accounts. A guest types DELETE; a saved account types DELETE and its password. The client calls `DELETE /api/users/me` (`src/routes/users.js`), the server anonymises the account in one transaction (`src/account/index.js` `deleteAccount`), then the app logs out and opens `/?deleted=1` ("Your account has been deleted"). Nothing in the native shell blocks it: it is an ordinary API call (CORS allows the app origins and DELETE). There are no subscriptions, so there is nothing to cancel first or warn about.

**Without the app (Google's "delete account URL"):** **https://marblespins.com/help/how-do-i-delete-my-account**. It is a pre-rendered Help Centre page, in the sitemap. It names Marble Spins and Voltron Robotics AB, gives the steps in the app, on the website (log in, Settings), and with the contact form (topic "Privacy and your data") for someone who can't log in, says what is deleted and what is kept (purchase records, 7 years, without name or email), and that there are no subscriptions to cancel. A guest account can't be found without its device, so the page says it is deleted by itself after 90 days unused.

**Tests:** `test/account.test.js` ("news by email, unsubscribe, download my data, delete my account") and the other server tests that delete accounts (admin, applePurchases, cookieConsent, googlePlay, passwordReset, seasonPass, signup, support): 30 of 30 pass. Client: `client/test/storeRules.test.js`.

## App Store (Apple)

| Rule | Status | What we do |
|---|---|---|
| **1.3 Kids Category**, **5.1.4 Kids** | OK, needs Moses (category) | Not in the Kids Category. No "for kids" words in the store texts (2.3.8). Under-13 guests store no personal data (no email, no birth date). Kids rules need no purchases or links without a parental gate, which we don't have, so we stay out of it. |
| **2.1 App completeness** (demo account, IAP visible to the reviewer) | Needs Moses | A demo saved account (email and password) in the review notes, plus a note that guests can play without one. The coin packs and the pass must be "Ready to Submit" in App Store Connect. The pass is sold from 28 Nov: before that the reviewer sees it as "coming"; say so in the notes (or use the tester account, which can buy in the sandbox). |
| **2.1 / 2.3 placeholder text** | Fixed | The Help Centre in the apps no longer shows "[coming at launch]" about the apps. Other `[brackets]` still in Help answers ("[2 working days]", "[Live once email is switched on.]") must be filled before review. |
| **2.3.10 other platforms** | Fixed | In the iPhone app the Help Centre no longer names Android or Google Play, and the landing page's "Do I need to download anything? … Apps for iPhone and Android are on the way" is website only. Left as is: the legal page (terms and privacy name Apple and Google as payment and push processors; a legal text, low risk). |
| **3.1.1 In-app purchase** (coins, the pass) | OK, fixed | Coins and the pass are bought with StoreKit 2 in the iPhone app; Stripe is never used in the apps (`client/src/site/payments/index.js`). Coins never expire. Fixed: the shop and checkout showed the website's dollar price until the App Store answered; now only the App Store's price (or nothing). |
| **3.1.1 restore** (non-consumable pass) | OK | Pass page: **Restore purchases** on iPhone (`restoreStorePurchases`). Help answer "How do I restore my pass on iPhone?". |
| **3.1.1 loot boxes** | OK | None. Bags list exactly which marbles they hold, and the player picks the shade. No random paid item anywhere (the only server randomness is starter marbles, room codes, track picks). |
| **3.1.1 codes** (own codes may not unlock content) | OK | Gift codes are website only: `/redeem` and the Settings link are hidden in the apps (`giftCodesOn()` checks `isNativeApp()`). |
| **3.1.1(a) / 3.1.3 no other purchase methods** | OK, fixed | No link to Stripe, `/checkout` on the web, or the website's shop in the apps. In-app `/checkout` uses the store. Fixed: Help answers about buying in the apps now speak only of that app's store (no Stripe, no "on the website: card…", no dollar price table, no "$9.99"). The footer's links (Help, Shop, Terms, Privacy, Cookies, Tracks, Contact) stay inside the app. |
| **3.1.3(b) multiplatform** | OK | Coins and the pass bought on the website work in the app. Both are also sold as in-app purchases, as the rule requires. |
| **4.2 minimum functionality** (web wrapper risk) | OK, argue it | A full 3D game, bundled in the app, not a website in a frame. Native: in-app purchases and restore, push (when switched on), offline screen, silent-switch audio, back button, splash, status bar. Put this in the review notes. |
| **4.8 login services** | OK | Only our own email and password accounts, so 4.8 doesn't apply. No Apple or Google sign-in buttons (checked in `storeRules.test.js`). If Google sign-in is ever added, Sign in with Apple (or an equal option) must come with it. |
| **5.1.1(i) privacy policy** | OK | `/legal#privacy`, linked in the footer of every page in the app. Needs Moses: the same link in App Store Connect, and the DRAFT banner removed. |
| **5.1.1(v) account deletion** | OK, fixed | See "Account deletion" above. Fixed: Settings in the apps' footer, so guests find it in one tap. |
| **5.1.2 data use, tracking** | OK | No tracking in the apps, so no App Tracking Transparency prompt. Push is optional and nothing depends on it. |
| **5.3 contests, sweepstakes** | Needs Moses (when used) | No contest in the app today. Creator giveaways of gift codes run outside the app, by us (5.3.1). If a giveaway is ever shown in the app, its official rules must be in the app and say Apple is not a sponsor (5.3.2). No real-money gaming; coins can't be cashed out (5.3.3, 5.3.4). |
| **iPad** (the app runs on iPad, `TARGETED_DEVICE_FAMILY = 1,2`) | Needs Moses | iPad screenshots and an iPad test before review (decision of 14 Oct). |
| **Privacy manifest** | OK, check | Capacitor 8 ships its own `PrivacyInfo.xcprivacy`; the app has none of its own. Check Xcode's privacy report on the first archive. |

## Google Play

| Policy | Status | What we do |
|---|---|---|
| **Payments** (Google Play Billing for digital goods) | OK, fixed | Coins and the pass use Google Play Billing in the Android app; the server checks every purchase with Google. No Stripe or website link to buy. Fixed: no website dollar price while Google Play's price loads; Help answers about buying name Google Play only. |
| **Account deletion** (in-app path and a web link) | OK, fixed | In-app: Settings → Delete my account (now also in the footer). Web link for the Data safety form: https://marblespins.com/help/how-do-i-delete-my-account (fixed: the answer now has the web and contact-form paths, what is kept and for how long). |
| **User Data, Data safety** | Needs Moses | Fill in the form with the answers below. Privacy policy link: https://marblespins.com/legal#privacy. |
| **Permissions** | OK | `INTERNET`; `BILLING` added by the billing library; `POST_NOTIFICATIONS` from the push plugin (Android 13+), asked only after the first finished race and only once push is switched on; nothing depends on saying yes. Season news by push is marketing: opt-in, never for guests or under-13s. No location, contacts, camera or storage. `AD_ID` removed. |
| **Target audience and content, Families** | Needs Moses | Recommended: target ages **13–15, 16–17, 18+** (decision of 14 Oct). See "Target audience" below. |
| **Deceptive behaviour** | OK | Computer players are always marked with the robot icon. Purchases never make a marble faster, and the shop and Help say so. |
| **Gambling, simulated gambling, loot boxes** | OK | Coin entry fees are off (14 Oct decision), there is no betting, no random paid items, and coins can't be cashed out or traded. |
| **Real-money gambling, contests** | OK | None. Giveaways are run by us outside the app. |
| **Spam and minimum functionality** | OK | A full game, bundled in the app, not a web view of the website. |
| **User-generated content** (Apple 1.2: filter, report, act) | OK (22 Oct) | Only the player name is visible to others (scoreboards, race results, rooms). No chat, no uploads shown to other players. **Filter:** offensive names are refused when chosen or changed (English and 11 more languages, leetspeak, separators; `client/src/shared/nameFilter.js`). **Report:** "Report this name" (⚑) on scoreboards and race results and on the tapped-marble card. **Act:** the back office's Name reports page renames (PlayerNNNN) or dismisses, audited, and lists older names the filter would block. Apple 1.2's "block abusive users" fits a chat app; here a player can't contact anyone, and the back office can suspend an account. |

## Target audience (both stores)

Under-13s can play as guests, but nothing is aimed at them: no account, no purchases, no email, no marketing, no push marketing.

- **Option A, recommended: 13+ only** (Google: 13–15, 16–17, 18+; Apple: not Kids Category). The Families policy doesn't apply. Risk: Google may decide the store listing appeals to children (bright marbles, "all ages"). Keep the store texts and graphics neutral, never "for kids", and don't say "for all ages" in the listing. The Help Centre's "Marble Spins is for all ages" can stay on the website, but it is better changed to "Anyone can race as a guest; saving an account is for 13 and older."
- **Option B: include under-13 ages.** The Families policy applies: a privacy policy covering children, no non-certified SDKs, no identifiers from children, and Google reviews the app as a children's app (purchases, links out). Our app is close (no ads, no SDKs), but it is a bigger review and commitment. Not now.

## Proposed age-rating answers

**Apple (App Store Connect age rating questions):**

| Question | Answer |
|---|---|
| In-app controls: parental controls | No |
| In-app controls: age assurance | No (we ask the birth year and month, but don't verify it) |
| Unrestricted web access | No (all links stay inside the app; social links are hidden in the apps) |
| User-generated content | No: the only free text is the player name, filtered when chosen, reportable and moderated (Moses, 22 Oct). If App Review disagrees, answer Yes: the filter, reports and moderation are what Apple 1.2 asks for, and the rating stays low |
| Social media | No |
| Messaging and chat | No |
| Advertising | No |
| Profanity, horror, alcohol/tobacco/drugs, medical, sexual content, violence, weapons | None |
| Gambling | No |
| Simulated gambling | None |
| Contests | None |
| Loot boxes | No |

Expected rating: **4+**. In-app purchases are shown on the listing anyway. (A higher rating isn't needed: the 13+ rule is about accounts, not content.)

**Google (IARC questionnaire, category Game):**

| Question | Answer |
|---|---|
| Violence, fear, sexuality, language, controlled substances, crude humour | No |
| Gambling: real-money gambling, simulated gambling | No |
| Users can interact or exchange content (chat, voice, photos) | No (friend rooms show player names only) |
| Shares the user's location with others | No |
| Allows purchases of digital goods | Yes |
| Randomised items for purchase (loot boxes) | No |
| Unrestricted internet access | No |

Expected: PEGI 3, ESRB Everyone, USK 0, with "In-game purchases" (without "includes random items").

## Proposed App Privacy answers (Apple)

Tracking: **No**. No data used for tracking. No third-party advertising or analytics in the app.

| Data type | Collected | Linked to the user | Purpose |
|---|---|---|---|
| Contact info: Email address | Yes (saved accounts, contact form) | Yes | App functionality (account, receipts), customer support |
| Contact info: Name | Yes (contact form only, optional) | Yes | Customer support |
| Identifiers: User ID (account ID, player name) | Yes | Yes | App functionality |
| Identifiers: Device ID (push token, once push is switched on) | Yes | Yes | App functionality |
| Purchases: Purchase history | Yes | Yes | App functionality |
| Usage data: Gameplay content (races, results, marbles) | Yes | Yes | App functionality |
| Location: Coarse location (country from the IP address; the IP itself deleted after 90 days) | Yes | Yes | App functionality (security, fraud prevention) |
| User content: Customer support (contact form messages, screenshots) | Yes | Yes | Customer support |
| Other data: birth year and month (saved accounts); the country the player chooses to race for (optional, from 22 Oct 2026) | Yes | Yes | App functionality (age group; country records) |
| Diagnostics (crash data, performance) | No | | |
| Health, financial info, contacts, browsing history, search history, precise location, sensitive info | No | | |

## Proposed Data safety answers (Google)

- Does the app collect or share user data? **Yes, collects.** Shared with third parties: **No** (Google Play, Apple and our processors act for us; that isn't "sharing" in the form's sense).
- Encrypted in transit: **Yes** (HTTPS only).
- Users can request deletion: **Yes**, in the app and at https://marblespins.com/help/how-do-i-delete-my-account.
- Committed to the Families policy: **No** (target audience 13+).

| Category: data type | Required or optional | Purposes |
|---|---|---|
| Personal info: Email address | Optional (guests have none) | App functionality, account management, developer communications (news only if opted in) |
| Personal info: User IDs | Required | App functionality, account management, fraud prevention and security |
| Personal info: Name | Optional (contact form) | Customer support (counts under App functionality) |
| Personal info: Other info (birth year and month; the country the player chooses to race for) | Optional (saved accounts) | App functionality, account management |
| Financial info: Purchase history | Optional | App functionality, account management |
| Location: Approximate location (country from IP) | Required | Fraud prevention, security and compliance |
| Messages: Other in-app messages (contact form) | Optional | App functionality (support) |
| Photos and videos: Photos (a screenshot attached to a support message) | Optional | App functionality (support) |
| App activity: Other actions (races, results, marbles) | Required | App functionality |
| Device or other IDs (push token, once push is switched on; Firebase Cloud Messaging) | Optional | App functionality |
| App info and performance (crash logs, diagnostics) | Not collected | |

## Needs Moses

1. ~~**Target audience:**~~ confirmed by Moses 22 Oct: 13–15, 16–17, 18+ on Google Play and no Kids Category on Apple, and keep the store texts and graphics neutral (never "for kids", no "all ages" in the listing). Optionally change the Help answer "Marble Spins is for all ages" to "Anyone can race as a guest; saving an account is for 13 and older."
2. **Store forms:** enter the age-rating, App Privacy and Data safety answers above; the deletion URL https://marblespins.com/help/how-do-i-delete-my-account; the privacy policy https://marblespins.com/legal#privacy (remove the legal page's DRAFT banner first).
3. **Review notes and demo account:** a saved demo account for Apple and Google, "guests can play without an account", the native features (4.2), and how the reviewer can see the pass before 28 Nov (tester account, sandbox).
4. **Placeholders:** "[2 working days]" filled (22 Oct). "[Live once email is switched on.]" stays until Brevo is on (Moses): if email isn't on by submission, reviewers will see that bracket in the Help Centre.
5. **Deletion by message:** confirm "within one month" for deletions asked through the contact form, and that support handles them in the back office (Players → delete).
6. ~~**Player names:**~~ done 22 Oct: the name filter, "Report this name" and the back-office Name reports page.
7. **iPad:** screenshots and a test on an iPad (the app runs on iPad).
8. **Giveaways:** if one is ever announced inside the app, add its official rules in the app with "Apple is not a sponsor".
9. **Project doc:** the Help answer texts in the project doc `claude/help-faq-draft.md` differ now for the deletion answer and the in-app buying answers; update the draft if it stays the source.

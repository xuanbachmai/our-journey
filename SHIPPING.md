# Shipping Our Journey

## Today: it already installs like an app

The game is a web app with an icon and a manifest, so on a phone it can be added
to the home screen and opens full screen, with no browser bars and no store.

- **iPhone**: open the Vercel link in Safari, Share, "Add to Home Screen".
- **Android**: open the link in Chrome, menu, "Install app" or "Add to Home screen".

That is the fastest way for the two of you to play. Nothing below is needed for it.

## Turning it into a real App Store / Google Play app

The game is HTML5 (Phaser + TypeScript), so the normal route is
[Capacitor](https://capacitorjs.com): it wraps the built web app in a native
iOS and Android project that can be signed and submitted. No rewrite.

### Steps

1. `npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/ios @capacitor/android -w @hh/client`
2. `npx cap init "Our Journey" com.ourjourney.game --web-dir=dist` in `packages/client`
3. `npm run build -w @hh/client && npx cap add ios && npx cap add android && npx cap sync`
4. Open `ios/App/App.xcworkspace` in Xcode (needs a Mac) and `android/` in Android Studio, then build, sign and upload.

### Accounts and cost

- Apple Developer Program: 99 USD a year. A Mac is required to build and upload.
- Google Play Developer: 25 USD once.
- Both need: app icon (have), screenshots, a short description, a privacy policy URL, an age rating questionnaire and a support contact.

### Work to do before submitting

| Area | What is needed | Why |
|---|---|---|
| Security | Supabase row level security so a farm code alone cannot read or write another couple's world; rate limits | Today the anon key trusts the client. Fine for two friends, not for a public app |
| Accounts | Optional sign-in, plus in-app data deletion | Apple 5.1.1(v) requires account deletion if accounts exist. "Erase this phone" covers the device; server-side deletion is still needed |
| Offline | A friendly screen when there is no network, since reviewers test in airplane mode | Solo mode already works with no backend; pairing must fail gracefully |
| Android back button | Handle the hardware back button (close panels, then confirm exit) | Play guideline, and it feels broken otherwise |
| Storage | Move the local save to Capacitor Preferences | WKWebView can evict localStorage |
| Orientation | Lock to landscape in the native projects | The game assumes landscape |
| Audio | Resume audio when the app returns from the background | iOS suspends the audio context |
| Store copy | Screenshots at the required sizes, a 30 second preview, keywords | Store listing |
| Money (2.0) | StoreKit and Play Billing for cosmetic packs only | The game stays free for couples |

### What would stay the same

The whole game, the art, the save format and the shared rules package need no
changes. The work above is packaging, security and store paperwork.

### A middle step worth considering

Publish the PWA link and share it with friends first. It costs nothing, updates
instantly, and it is the same build the store app would wrap. Move to the stores
when you want the listing, push notifications or in-app purchases.

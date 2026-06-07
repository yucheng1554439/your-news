# App Store Readiness Checklist

> **Full audit:** [APP_STORE_LAUNCH_AUDIT.md](./APP_STORE_LAUNCH_AUDIT.md) — prioritized P0/P1/P2 with Apple guideline mapping.

Pre-launch checklist for iOS App Store and Google Play.

---

## App identity

- [ ] **App name** — "Your News" (or final brand) registered in App Store Connect
- [ ] **Bundle identifier** — matches `mobile/app.json` (`ios.bundleIdentifier`)
- [ ] **App icon** — 1024×1024 PNG, no alpha (iOS)
- [ ] **Splash screen** — configured in `app.json` / Expo splash plugin
- [ ] **Accent color / brand** — consistent with web

---

## Legal & support (required)

- [ ] **Privacy policy URL** — publicly accessible HTTPS
- [ ] **Terms of service URL**
- [ ] **Support URL** — help page or mailto support@yournews.app
- [ ] Privacy policy covers: Clerk auth, news ingest, AI processing, saved stories
- [ ] Link legal pages from mobile Settings screen

---

## App Store Connect metadata

- [ ] **Subtitle** — e.g. "Personalized AI intelligence briefings"
- [ ] **Description** — 4000 char max; lead with value prop
- [ ] **Keywords** — intelligence, news, briefing, personalized, signals (100 char max)
- [ ] **Category** — News or Business
- [ ] **Age rating** — complete questionnaire (likely 12+ for news content)
- [ ] **Copyright** — © 2026 Your News

---

## Screenshots

Required device sizes (iOS):

- [ ] 6.7" (iPhone 15 Pro Max)
- [ ] 6.5" (optional legacy)
- [ ] 5.5" (optional legacy)
- [ ] iPad if supporting tablet

Suggested screens:

1. Home feed with lead story
2. For You briefing pager
3. Signals list
4. Story intelligence detail
5. Settings / Intelligence profile

Store in `docs/assets/app-store/`.

---

## Technical

- [ ] Production `EXPO_PUBLIC_API_BASE_URL` in EAS secrets
- [ ] Production Clerk publishable key (live, not test)
- [ ] `eas.json` submit config filled (Apple ID, ASC App ID, team ID)
- [ ] Push notification entitlement — only if implementing push
- [ ] Sign in with Apple — required if offering Google/social login on iOS
- [ ] ATS (App Transport Security) — HTTPS API only in production
- [ ] No hardcoded localhost in release builds

---

## TestFlight checklist

- [ ] Internal TestFlight build uploaded via EAS
- [ ] Smoke test: sign up, onboarding, dashboard load
- [ ] Smoke test: briefings render, swipe sections
- [ ] Smoke test: save/unsave story
- [ ] Smoke test: refresh intelligence (long operation)
- [ ] Smoke test: sign out / sign in
- [ ] External tester group (optional beta)
- [ ] Collect crash-free session rate > 99%

---

## Launch checklist

- [ ] App Review Information — demo account credentials for Apple
- [ ] Review notes explain AI-generated content and news sources
- [ ] Export compliance — standard encryption (HTTPS only) → typically "No" for custom encryption
- [ ] Phased release enabled (recommended)
- [ ] Monitor `/api/v1/health` post-launch
- [ ] Rollback plan documented ([DEPLOYMENT.md](./DEPLOYMENT.md))

---

## Google Play (if releasing Android)

- [ ] Play Console app created
- [ ] Data safety form completed
- [ ] Content rating questionnaire
- [ ] Store listing + screenshots
- [ ] Internal testing track → production

---

## Post-launch

- [ ] Monitor reviews and crash reports
- [ ] Respond to support within 48h
- [ ] Plan 1.0.1 for critical fixes within 2 weeks

---

## Related

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [MOBILE_ARCHITECTURE.md](./MOBILE_ARCHITECTURE.md)
- [mobile/README.md](../mobile/README.md)

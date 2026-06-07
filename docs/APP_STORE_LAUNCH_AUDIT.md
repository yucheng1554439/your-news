# App Store Launch Readiness Audit

**Focus:** iOS App Store first-submission approval  
**Date:** 2026-06-03  
**App:** Your News (`com.yournews.app`)

This audit maps Apple App Review requirements to repository status. Items marked **IMPLEMENTED** were added in this pass.

---

## Executive summary

| Area | Status | Blocker? |
|------|--------|----------|
| Sign in with Apple | **IMPLEMENTED** (code) — Clerk config pending | Yes until Clerk + Apple Developer configured |
| Privacy Policy URL | **IMPLEMENTED** (`/privacy`) | Set `NEXT_PUBLIC_APP_URL` in production |
| Terms of Service URL | **IMPLEMENTED** (`/terms`) | Same |
| Support URL | **IMPLEMENTED** (`/support`) | Same |
| In-app account deletion | **IMPLEMENTED** | Test on device before submit |
| Auth legal disclosure | **IMPLEMENTED** | — |
| App Privacy (nutrition labels) | **DOCUMENTED** below | Manual entry in App Store Connect |
| Analytics disclosure | **No SDKs** — disclose accurately | — |
| App icon & splash | **IMPLEMENTED** (placeholder assets) | Replace with final brand before marketing |
| Screenshots | **MISSING** | Required for submission |
| Demo account for review | **MISSING** | Required in App Store Connect |
| Clerk Apple OAuth | **MISSING** (dashboard) | Required for Apple sign-in to work |

**Verdict:** Codebase is substantially review-ready. **External configuration** (Apple Developer, Clerk Apple provider, App Store Connect metadata, screenshots, demo account) remains before submit.

---

## P0 — Submission blockers (must complete)

### 1. Sign in with Apple (Guideline 4.8)

**Requirement:** Apps using Google/third-party login must offer Sign in with Apple on iOS with equivalent prominence.

| Item | Status |
|------|--------|
| `AppleSignInButton` on sign-in / sign-up (iOS) | ✅ IMPLEMENTED |
| `usesAppleSignIn: true` in `app.json` | ✅ IMPLEMENTED |
| `expo-apple-authentication` plugin | ✅ IMPLEMENTED |
| Apple listed **above** Google on auth screens | ✅ IMPLEMENTED |
| Clerk Dashboard → Apple OAuth enabled | ❌ Manual — [Clerk Apple setup](https://clerk.com/docs/authentication/social-connections/apple) |
| Apple Developer → Services ID + key for Sign in with Apple | ❌ Manual |
| Redirect URL `yournews://` in Clerk allowed URLs | ❌ Manual |

### 2. Privacy Policy URL (Guideline 5.1.1)

| Item | Status |
|------|--------|
| Public HTTPS page | ✅ `/privacy` |
| Linked from Settings (mobile) | ✅ IMPLEMENTED |
| Linked from auth (sign-up terms text) | ✅ IMPLEMENTED |
| URL in App Store Connect | ❌ Set to `https://YOUR_DOMAIN/privacy` |
| `NEXT_PUBLIC_APP_URL` on Vercel | ❌ Deploy + env |

**Privacy policy must cover:** email, name, preferences, saved stories, AI processing, Clerk, Redis, no ad tracking (currently true).

### 3. Account deletion (Guideline 5.1.1(v))

| Item | Status |
|------|--------|
| In-app deletion path | ✅ Settings → Delete account |
| Deletes KV user profile + intel snapshots | ✅ `DELETE /api/v1/profile/account` |
| Deletes Clerk user | ✅ `deleteAccountForUser` |
| Web parity | ✅ Settings page |
| Not hidden — clear confirmation | ✅ Alert / confirm dialog |

### 4. Support URL (App Store Connect required field)

| Item | Status |
|------|--------|
| Public support page | ✅ `/support` |
| Support email visible | ✅ `support@yournews.app` |
| Linked in mobile Settings | ✅ IMPLEMENTED |

### 5. App Store Connect metadata

| Field | Status |
|-------|--------|
| App name, subtitle, description | ❌ Write in ASC |
| Keywords (100 chars) | ❌ |
| Primary category (News or Business) | ❌ |
| Age rating questionnaire | ❌ Complete in ASC |
| Privacy Policy URL field | ❌ |
| Support URL field | ❌ |
| Copyright | ❌ |
| **Demo account** (username + password) | ❌ **Critical for first-pass review** |
| Review notes (AI-generated content explanation) | ❌ |

---

## P1 — High rejection risk if missing

### 6. Terms of Service

| Item | Status |
|------|--------|
| Public `/terms` page | ✅ IMPLEMENTED |
| Linked at sign-up | ✅ IMPLEMENTED |

### 7. App Privacy Details (nutrition labels)

Declare in App Store Connect → App Privacy. **Current app behavior:**

| Data type | Collected | Linked to user | Used for tracking |
|-----------|-----------|----------------|-------------------|
| Email address | Yes (Clerk) | Yes | No |
| Name | Optional (Clerk) | Yes | No |
| User ID | Yes (Clerk) | Yes | No |
| Product interaction (saved stories, prefs) | Yes | Yes | No |
| **No** precise location | No | — | — |
| **No** contacts / photos / microphone | No | — | — |
| **No** third-party analytics SDKs | No | — | — |

**Third-party data sharing (disclose):** Clerk (auth), Vercel (hosting), Upstash (storage), Anthropic/OpenAI (server-side AI — not on-device SDK).

`app.json` includes `privacyManifests` for iOS 17+ API declarations.

### 8. Export compliance

| Item | Status |
|------|--------|
| `ITSAppUsesNonExemptEncryption: false` | ✅ IMPLEMENTED (HTTPS only) |
| App Store Connect export question | ❌ Answer "No" for standard HTTPS |

### 9. AI-generated content (Guideline 5.x / review scrutiny)

| Item | Status |
|------|--------|
| Review notes explain AI briefings | ❌ Add to ASC |
| In-app distinction (editorial AI product) | ✅ Product positioning |
| Misinformation disclaimer in Terms | ✅ IMPLEMENTED |

Suggested review note:

> Your News generates AI intelligence briefings from licensed news APIs. Sign in with demo account provided. Refresh Intelligence in Settings regenerates content. Account deletion is under Settings → Delete account.

### 10. Screenshots (required sizes)

| Device | Size | Status |
|--------|------|--------|
| iPhone 6.7" | 1290 × 2796 | ❌ MISSING |
| iPhone 6.5" | 1284 × 2778 | ❌ Optional |
| iPad 12.9" | 2048 × 2732 | ❌ If supporting iPad |

**Capture:** Home feed, Briefings pager, Signals, Story detail, Settings.

Store in `docs/assets/app-store/`.

---

## P2 — Polish & first-pass confidence

### 11. App icon & splash

| Asset | Path | Status |
|-------|------|--------|
| Icon 1024×1024 | `mobile/assets/icon.png` | ✅ Placeholder |
| Splash | `mobile/assets/splash.png` | ✅ Placeholder |
| Android adaptive | `mobile/assets/adaptive-icon.png` | ✅ Placeholder |

Replace placeholders with final brand before marketing launch.

### 12. Version & bundle

| Item | Status |
|------|--------|
| Marketing version `1.0.0` | ✅ Updated in `app.json` |
| Bundle ID `com.yournews.app` | ✅ |
| EAS production profile | ✅ `eas.json` |
| EAS submit credentials | ❌ Fill Apple IDs |

### 13. Authentication edge cases

| Item | Status |
|------|--------|
| Email verification flow | ✅ `verify-email.tsx` |
| OAuth redirect scheme `yournews://` | ✅ |
| Sign out | ✅ |
| No login required for legal pages | ✅ Web public routes |

### 14. Permissions & purpose strings

| Permission | Used? | Status |
|------------|-------|--------|
| Camera | No | N/A |
| Photo library | No | N/A |
| Location | No | N/A |
| Tracking (ATT) | No | No ATT prompt needed |
| `NSUserTrackingUsageDescription` | Future-proof only | ✅ In infoPlist |

### 15. In-app purchases / subscriptions

Not implemented — declare **No** in App Store Connect.

### 16. Kids / age rating

Recommend **12+** (infrequent/mild news themes). Complete ASC questionnaire.

---

## Analytics disclosure

**Current state:** No Firebase, Amplitude, PostHog, Sentry, or Meta SDK in mobile `package.json`.

| Disclosure location | Statement |
|---------------------|-----------|
| Privacy Policy | ✅ "We do not integrate third-party advertising or analytics SDKs" |
| App Store Connect App Privacy | Select **No** for "Data Used to Track You" |
| If adding Sentry later | Update privacy policy + ASC + add SDK privacy manifest |

---

## Prioritized checklist (ordered)

### Before EAS production build

- [ ] Set `NEXT_PUBLIC_APP_URL` on Vercel (production domain)
- [ ] Set `EXPO_PUBLIC_LEGAL_BASE_URL` in EAS secrets (same domain)
- [ ] Enable Apple OAuth in Clerk + Apple Developer portal
- [ ] Add `yournews://` to Clerk redirect URLs
- [ ] Verify `/privacy`, `/terms`, `/support` load on production HTTPS
- [ ] Test Sign in with Apple on physical iPhone (TestFlight)
- [ ] Test account deletion end-to-end
- [ ] Replace placeholder icon if needed

### Before App Store Connect submission

- [ ] Capture 6.7" screenshots (minimum 3–5)
- [ ] Write app description + keywords
- [ ] Complete App Privacy questionnaire (use table above)
- [ ] Enter Privacy Policy + Support URLs
- [ ] Create demo account; add credentials to App Review Information
- [ ] Write review notes (AI content, how to refresh, delete account)
- [ ] Complete age rating
- [ ] Fill `eas.json` submit Apple IDs
- [ ] `eas build --platform ios --profile production`
- [ ] TestFlight internal QA pass
- [ ] `eas submit --platform ios`

---

## Implemented in this audit

| File | Purpose |
|------|---------|
| `app/privacy/page.tsx` | Privacy policy |
| `app/terms/page.tsx` | Terms of service |
| `app/support/page.tsx` | Support URL |
| `app/api/v1/profile/account/route.ts` | Account deletion API |
| `lib/services/delete-account.ts` | Delete KV + Clerk |
| `mobile/.../AppleSignInButton.tsx` | Sign in with Apple |
| `mobile/.../AuthLegalFooter.tsx` | Terms/privacy on auth |
| `mobile/.../settings/delete-account.tsx` | Deletion UI |
| `mobile/app.json` | Apple Sign In, privacy manifest, icon |
| `mobile/assets/*` | Icon/splash placeholders |
| `components/settings/AccountLegalSection.tsx` | Web legal + delete |

---

## Related

- [APP_STORE_CHECKLIST.md](./APP_STORE_CHECKLIST.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [mobile/assets/ASSETS.md](../mobile/assets/ASSETS.md)

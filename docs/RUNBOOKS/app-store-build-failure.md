# Runbook: App Store Build Failure

## Symptoms

- `eas build` fails locally or on EAS servers
- TestFlight upload rejected
- App Review rejection
- Build succeeds but app crashes on launch

## Diagnosis

### EAS build failure

1. Read EAS build logs in Expo dashboard
2. Common causes:
   - Missing `EXPO_PUBLIC_*` secrets in EAS
   - Invalid `app.json` / bundle identifier conflict
   - Native dependency incompatibility
   - Apple credentials expired

### TestFlight / submit failure

1. `eas submit` logs
2. Verify `eas.json` submit block: `appleId`, `ascAppId`, `appleTeamId`
3. App Store Connect — app record exists with matching bundle ID

### Runtime crash on launch

1. TestFlight crash logs in App Store Connect
2. Often: wrong `EXPO_PUBLIC_API_BASE_URL` (localhost in production build)
3. Missing Clerk publishable key in EAS secrets

## Fix

### Missing env in EAS

```bash
eas secret:create --name EXPO_PUBLIC_API_BASE_URL --value https://your-app.vercel.app/api/v1
eas secret:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_...
```

Rebuild with `--clear-cache`.

### Bundle ID conflict

1. Change `ios.bundleIdentifier` in `app.json` or use correct Apple app record

### Credentials

```bash
eas credentials
```

Regenerate provisioning profile / distribution cert if expired.

### App Review rejection

1. Read rejection reason in App Store Connect
2. Common: missing Sign in with Apple, privacy policy, demo account
3. See [APP_STORE_CHECKLIST.md](../APP_STORE_CHECKLIST.md)

## Prevention

- CI: `npx tsc --noEmit` in `mobile/` before release
- Preview build to internal TestFlight before production submit
- Checklist in APP_STORE_CHECKLIST.md

## Communication

Internal — track build ID and blocker in release channel.

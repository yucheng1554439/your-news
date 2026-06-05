# Your News — Mobile (Expo SDK 54)

Expo SDK **54** — compatible with the current **Expo Go** app on iPhone.

Uses the same backend as web via `/api/v1`.

## Setup

1. Install dependencies (required after clone):

```bash
cd mobile
npm install
```

2. Start the web API locally:

```bash
cd ..
npm run dev
```

3. Configure Clerk + API URL:

Create `mobile/.env` (see `.env.example`):

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000/api/v1
```

Use the **same** Clerk key as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in the web app's `.env.local`.

**Physical iPhone:** `EXPO_PUBLIC_API_BASE_URL` must be your PC's **LAN IP**, not `localhost`. On the phone, `localhost` means the phone itself. Find your IP with `ipconfig` (Windows) and ensure the web dev server is running (`npm run dev` in the repo root). Restart Expo after changing `.env`.

### Google Sign-In (Clerk OAuth)

1. In [Clerk Dashboard](https://dashboard.clerk.com) → **User & Authentication** → **Social connections**, enable **Google**.
2. Under **Paths** → **Redirect URLs**, add:
   - `yournews://`
   - Your Expo Go dev URL (shown in Metro when you run `npx expo start`), e.g. `exp://192.168.x.x:8081/--/`
3. The app uses scheme `yournews` (see `app.json`). OAuth completes via `WebBrowser.maybeCompleteAuthSession()` in `app/_layout.tsx`.

Sign-up flow: **Google** (primary) or **email + password** → **verification code** → dashboard.

4. Run the app (scan QR code with **Expo Go** on your iPhone):

```bash
npx expo start
```

Use **LAN** mode if your phone and PC are on the same Wi‑Fi.

Resolution order for API URL: `EXPO_PUBLIC_API_BASE_URL` (`.env`) → `app.json` `expo.extra.apiBaseUrl` → `http://localhost:3000/api/v1`.

## Troubleshooting

### `expo-asset cannot be found`

`expo-asset` must be a **direct** dependency (not only nested under `expo/`). Metro resolves `expo-asset/tools/hashAssetFiles` from the project root. This project lists `expo-asset` in `package.json` explicitly.

If you see this error after `npm install`, run:

```bash
npx expo install expo-asset expo-font @expo/metro-runtime
```

### Missing `babel.config.js` / `metro.config.js`

Both files are required at the `mobile/` root. Without them, Metro cannot start.

## API endpoints used

- `GET /api/v1/health`
- `GET /api/v1/dashboard`
- `GET /api/v1/profile/topics`
- `PUT /api/v1/profile/topics`

See `../docs/MOBILE.md` for full API documentation.

## TestFlight (later)

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```

Fill in `eas.json` submit credentials before App Store release.

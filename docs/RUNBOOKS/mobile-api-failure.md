# Runbook: Mobile API Failure

## Symptoms

- Mobile app shows loading errors on all tabs
- "Failed to load dashboard" / network error toasts
- Works on web, fails on mobile only
- 401 on all API calls from device

## Diagnosis

1. Confirm `EXPO_PUBLIC_API_BASE_URL` in EAS secrets / local `.env`
2. **Device cannot reach localhost** — must use LAN IP or production URL
3. Test API from device network:
   ```bash
   curl https://your-app.vercel.app/api/v1/health
   ```
4. Mobile logs — JWT attached? Clerk session active?
5. SSL/certificate issues with custom domains
6. CORS rarely affects mobile (native fetch) — focus on URL + auth

## Fix

### Wrong API URL

| Environment | URL |
|-------------|-----|
| Simulator iOS | `http://localhost:3000` may work |
| Physical device | `http://192.168.x.x:3000` or production HTTPS |
| Production | `https://your-app.vercel.app` |

Update EAS secrets → rebuild.

### Auth token not sent

1. Sign out and sign in
2. Verify Clerk publishable key matches backend instance
3. Check `mobile/src/api/client.ts` token retrieval

### Backend down

Follow [vercel-failure.md](./vercel-failure.md)

### 401 only on mobile

1. Clerk JWT template / session token expiry
2. `CLERK_SECRET_KEY` on server matches mobile Clerk app

## Prevention

- Health check banner in app when API unreachable
- Staging build profile with staging API URL
- Document device testing setup in [MOBILE.md](../MOBILE.md)

## Communication

> "Unable to connect to Your News servers. Check your connection or try again later."

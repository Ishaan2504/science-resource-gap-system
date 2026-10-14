# Science Resource Gap System frontend

## Local integration with the API

The frontend uses the backend REST API in live mode by default. Copy `.env.example` to `.env.local` if you want to configure a different API address:

```powershell
Copy-Item .env.example .env.local
```

With the API listening at `http://localhost:3000`, the Vite development server proxies `/api/v1` to the backend. This avoids browser cross-origin requests during local development. Change `API_PROXY_TARGET` if the backend listens elsewhere. `VITE_API_BASE_URL` should normally remain `/api/v1` while using this proxy.

Start PostgreSQL and Redis, configure `backend/.env` from `backend/.env.example`, then run the backend and frontend in separate terminals:

```powershell
cd backend
npm install
npm run migrate
npm run dev
```

```powershell
cd frontend
npm install
npm run dev
```

Sign in with an account already registered in the backend or seeded via `npm run seed:demo`. School and organisation accounts are created by `POST /api/v1/auth/register`; administrative and field coordinator accounts are created by the backend's documented admin workflow.

To use demonstration data, set `VITE_API_MODE=mock` in `.env.local`. In live mode (`VITE_API_MODE=live`), the app is backed end-to-end by the PostgreSQL database (or Supabase) and Node.js backend.

For a production deployment, configure the hosting web server or gateway to serve the frontend and proxy `/api/v1` to the backend. Set `VITE_API_BASE_URL` to the externally reachable API prefix if the frontend and API are hosted on different origins. The backend allows exact origins listed in `CORS_ALLOWED_ORIGINS`.

## Current API coverage

The typed client calls authentication, school collection/search/filter, school profile detail and update, assessment recording/submission/verification, requirement lifecycle (accept, status changes, data-change acknowledgement, feedback), resource catalogue, analytics reports, administrator user management, instructor/service/equipment feedback, and Google Gemini AI assistant endpoints. Instructor, service, and equipment feedback is saved with the submitter's account; administrators can review the inbox. The AI assistant uses Google Gemini (with authorized real-time user database context) when `GEMINI_API_KEY` is configured in `backend/.env`, and otherwise returns verified FAQ answers.

To enable AI answers, set `GEMINI_API_KEY` in `backend/.env`. Keep the key on the server and never add it to a frontend environment file. Without this setting, the assistant uses the curated FAQ answers.

## Android app

The Android app is a Capacitor wrapper around this React application. Android Studio project files live in `android/`; React remains the source for screens and business rules. The Android package ID currently matches the reference code (`com.example.idealabapp`) and should be changed to an organization-owned ID before release.

1. Install Android Studio, Android SDK tools, and JDK 21. Capacitor 8 requires Node.js 22 or newer; its Android plugin compiles Java 21 source. The Android build in this workspace could not produce an APK while only JDK 17 was installed.
2. Copy `.env.android.example` to `.env.android` and set `VITE_API_BASE_URL` to the deployed HTTPS API URL, such as `https://api.your-domain.in/api/v1`. The app intentionally rejects a relative `/api/v1` address because that path points inside the app WebView, not to the backend.
3. Set `CORS_ALLOWED_ORIGINS=https://localhost` in the API environment. Add the exact origin used by any hosted web portal as a comma-separated value.
4. Run `npm install`, then `npm run android:sync` to build the web assets and copy them into the Android project.
5. Open `android/` in Android Studio, select an emulator or connected device, and run the app. `npm run android:open` opens the project when Android Studio is registered with the operating system.

Android access and refresh tokens use encrypted native storage backed by Android Keystore. The web portal retains its existing browser storage. The Android system back button follows React Router history; the WebView stays within the visible system bars, and the activity resizes for the software keyboard.

The current backend has no offline draft synchronization or separate dispatch record workflow. The mobile app does not claim those features; offline field capture and dispatch tracking require additional product and backend work.

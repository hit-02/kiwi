#Nursing-face Web App

This project is a small nurse-facing web app. It includes:

- Login with JWT access token + refresh token
- Dashboard that lists patients and their latest vitals
- Profile page that loads and updates nurse profile info
- Robust API wrapper with automatic token refresh + retry
- A simple, cleaner UI style (shared `ui.ts`) to make screens look nicer

## Tech Stack

- React
- TypeScript
- Vite
- React Router

## Project Structure

- `src/api.ts`  
  API helpers for auth headers, refresh-token flow, and JSON helpers.
- `src/ui.ts`  
  Shared UI styles used across pages for consistent look.
- `src/pages/Login.tsx`  
  Login screen. Saves tokens to `localStorage` and redirects to dashboard.
- `src/pages/Dashboard.tsx`  
  Loads nurse header + patient list. Search + refresh. Handles 401 by redirecting to login.
- `src/pages/Profile.tsx`  
  Loads profile and updates it. Sends only changed fields. Tries `PATCH` then falls back to `PUT`.

## Requirements

- Node.js 18+ recommended
- npm (or yarn/pnpm)

## Setup

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Credentials

For the assessment API:

- Email: nurse1@kiwi.test
- Password: kiwi1234

## API Notes

This app assumes requests go through a Vite proxy so frontend can call API paths like:

- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/nurse/patients
- GET /api/nurse/profile
- PATCH /api/nurse/profile (fallback to PUT if not supported)

If you do not have the proxy configured, set API_BASE in src/api.ts to point at the backend base URL.

## Token Handling

- Access token is stored in localStorage under accessToken
- Refresh token is stored in localStorage under refreshToken

The helper apiFetch() automatically:

- Attaches the access token in Authorization: Bearer ...
- On 401, calls /api/auth/refresh once (single-flight)
- Retries the original request once
- Clears session if refresh fails or if retry still returns 401

## UI Updates

A shared style object in src/ui.ts is used to improve layout and spacing:

- Centered layout for Login
- Card-style containers
- Consistent buttons/inputs
- Soft background gradient

## Build

Create a production build:

```bash
npm run build
```

Preview the build locally:

```bash
npm run preview
```

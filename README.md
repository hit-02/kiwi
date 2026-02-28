# Kiwi Assessment (React + TypeScript + Vite)

This project is a small nurse-facing web app built for the Kiwi assessment. It includes:

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

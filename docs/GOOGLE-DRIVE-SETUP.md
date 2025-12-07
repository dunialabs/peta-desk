# Google Drive Authorization Guide

This guide explains how to configure Google Drive authorization for the PETA MCP Desktop app.

## Prerequisites
- A Google account
- Access to Google Cloud Console

## 1) Create a Google Cloud project
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Use the project picker and choose **New Project**.
3. Name it (for example `PETA MCP Desktop`) and create it.

## 2) Enable the Google Drive API
1. In the new project, go to **APIs & Services → Library**.
2. Search for **Google Drive API** and click **Enable**.

## 3) Configure the OAuth consent screen
1. Go to **APIs & Services → OAuth consent screen**.
2. Pick the user type: **Internal** for internal use, **External** for public use.
3. Fill out app info:
   - App name: `PETA MCP Desktop`
   - User support email: your email
   - App logo/homepage/authorized domains as needed
   - Developer contact info: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.appdata`
5. For external apps, add test users, then save.

## 4) Create an OAuth 2.0 client ID
1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Choose **Desktop app** and name it (e.g., `PETA Desktop Client`).
4. Add the redirect URI **`http://localhost`** (must match the code).
5. Create and note the **Client ID** and **Client Secret**; download the JSON if you prefer.

## 5) Configure the app

### Option A: Environment variables (recommended for dev)
Create `.env` in the repo root:
```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Option B: Direct edit (only for quick tests)
Update `electron/google-drive-auth.js`:
```javascript
const GOOGLE_CLIENT_ID = 'your_client_id.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = 'your_client_secret'
```
Do not commit real credentials.

### Option C: Config file (recommended for production)
Create `google-credentials.json` in the user data directory:
```json
{
  "client_id": "your_client_id.apps.googleusercontent.com",
  "client_secret": "your_client_secret"
}
```
Load the credentials from that file in `electron/google-drive-auth.js`.

## 6) Test the flow
1. Rebuild and start the app: `npm run dev`.
2. On the Dashboard, locate the Google tool.
3. Click **Authorize Google Drive** and finish the browser flow.
4. You should see an **Authorized** badge with your email after success.

## Redirect URI notes
- We use `http://localhost` for the desktop OAuth redirect.
- Flow: user clicks authorize → logs in → Google redirects to `http://localhost?...code=...` → the app captures the code → exchanges for access/refresh tokens → closes the auth window.
- If you change the redirect URI, update both `electron/google-drive-auth.js` and the OAuth client configuration in Cloud Console.

## Capabilities after authorization
- Upload backup files to the Drive `appDataFolder`
- List/download backup files
- Delete backup files
- Files stay hidden inside `appDataFolder`

## Security checklist
- Never hard-code credentials in committed code
- Keep `.env`/credential files out of version control
- Request minimal scopes (`drive.file`, `drive.appdata`)
- Tokens are stored with `electron-store` encryption; refresh regularly

## Common questions
- **App not verified warning**: expected for unverified apps; choose **Advanced → Continue** if you control the project.
- **Revoke access**: visit [Google account permissions](https://myaccount.google.com/permissions) or click **Logout** in the app.
- **Refresh token expired**: re-authorize (happens after long inactivity or manual revocation).

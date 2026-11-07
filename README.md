# StudyBuddyLTI

<img width="1829" height="733" alt="Screenshot from 2026-11-07 22-17-26" src="https://github.com/user-attachments/assets/b3ed66a6-ea31-4801-9980-2803dab883d6" />


Standalone Next.js application for the Study Buddy LTI tool.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:4200.

For LTI configuration, create `.env.local`:

```env
LTI_PLATFORM_AUTH_URL=https://your-platform.example/oidc/auth
LTI_CLIENT_ID=your-client-id
LTI_TOOL_BASE_URL=http://localhost:4200
LTI_SESSION_SECRET=use-a-local-secret
```

The standalone version uses an in-memory Study Buddy store for local
development. Data is reset when the server restarts.

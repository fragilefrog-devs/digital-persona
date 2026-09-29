# Anam Next.js App

Voice + text chat with an Anam AI persona (Cara), built from the Anam "Full application" guide.

## Run locally
```bash
npm install
cp .env.example .env.local   # add your ANAM_API_KEY
npm run dev                  # http://localhost:3000
```

## Deploy to Vercel
1. Push this folder to a Git repo and import it at vercel.com/new (or run `npx vercel`).
2. Add the environment variable `ANAM_API_KEY` (Project Settings → Environment Variables).
3. Deploy. HTTPS is provided automatically, which browsers require for microphone access.

## Notes
- The API key stays server-side in `app/api/session-token/route.ts`; the browser only receives a short-lived session token.
- The route includes a simple in-memory rate limit. For heavier traffic, use Redis/Upstash or Vercel WAF rate limiting.
- Customize the persona (avatar, voice, LLM, system prompt) in the route file.
- Features: connection states, live transcript, chat history, talk command, error handling.

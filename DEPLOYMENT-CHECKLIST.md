# FINAL DEPLOYMENT CHECKLIST

Before you push to production, check every item:

## Code & Quality
- [ ] Run `./pre-deploy-check.ps1` and ensure all green.
- [ ] `npm run build` succeeds locally.
- [ ] No `console.log` containing sensitive data remains.
- [ ] All imports match file casing exactly (Linux/Vercel requirement).

## Vercel Dashboard
- [ ] `DATABASE_URL` is set to production DB.
- [ ] `JWT_SECRET` is set to a secure, unique string.
- [ ] `NODE_ENV` is set to `production`.
- [ ] Node.js version is set to 20.x in settings.
- [ ] All AI API keys (OpenAI, Gemini, Deepgram) are configured.

## Post-Push Task
- [ ] Check Vercel **Build Logs** for success.
- [ ] Check `/api/health` returns `{ "status": "ok" }`.
- [ ] Verify you can log in on the live URL.
- [ ] Verify patient data loads correctly.
- [ ] Verify AI Transcription works on a small audio clip.

**GO / NO-GO**: [ ] **GO**

# TROUBLESHOOTING VERCEL DEPLOYMENT

## Common Issue: 404 on Page Refresh
- **Cause**: The browser is requesting a client-side route (e.g., `/dashboard`) from the Vercel server, which doesn't exist as a file.
- **Solution**: The `vercel.json` already contains a rewrite rule for this. Ensure the `rewrites` section is present:
  ```json
  { "source": "/((?!api/).*)", "destination": "/index.html" }
  ```

## Common Issue: 500 Error on API Routes
- **Cause**: Usually a missing environment variable (likely `DATABASE_URL` or `JWT_SECRET`).
- **Solution**: 
  1. Check Vercel **Function Logs**.
  2. Verify all required variables in `vercel-env-setup.md` are defined.
  3. Ensure your DB allows connections from Vercel IPs (Neon DB does this by default).

## Common Issue: Build Fails with "Module Not Found"
- **Cause**: Case-sensitivity in file names (Windows is case-insensitive, Vercel/Linux is case-sensitive).
- **Solution**: Verify all imports (e.g., `@/components/Button` vs `@/components/button`) match the actual file casing exactly.

## Common Issue: Database Connection Timeout
- **Cause**: Too many open connections or slow serverless cold start.
- **Solution**: 
  1. Use the **Neon Pooled Connection** string.
  2. Add `?sslmode=require` to your `DATABASE_URL`.
  3. Check `api/index.ts` logs for "Drizzle connection error".

## Common Issue: AI Features Not Working
- **Cause**: API Key missing or quota exceeded.
- **Solution**: Verify `OPENAI_API_KEY` or `DEEPGRAM_API_KEY` are correct.

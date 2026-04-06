# AIMS UPGRADED - RAILWAY DEPLOYMENT GUIDE
**Status:** GitHub Connected ✅  
**Next:** Complete Deployment

---

## STEP 1: VERIFY PROJECT CREATED

Go to https://railway.app/dashboard

You should see **NEW-AIMS-UPGRADED** project.

If NOT there:
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `Pablodd1/NEW-AIMS-UPGRADED`

---

## STEP 2: ADD ENVIRONMENT VARIABLES

Click on the project → **Variables** tab → **Raw Editor**

Paste this (fill in your values):

```bash
# REQUIRED (App will auto-generate if missing)
NODE_ENV=production
PORT=5000

# DEMO MODE (Works without database!)
VITE_ENABLE_LOGIN_BYPASS=true
DEMO_MODE=true

# DATABASE (Add later - get from https://neon.tech)
# DATABASE_URL=postgresql://...

# AI SERVICES (Add later)
# OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=AIzaSy...

# SECRETS (Auto-generated if not provided)
# SESSION_SECRET=... (32+ character random string)
# JWT_SECRET=... (32+ character random string)
```

**For DEMO MODE deployment, you only need:**
```
NODE_ENV=production
VITE_ENABLE_LOGIN_BYPASS=true
```

---

## STEP 3: DEPLOY

1. Variables added? Click **"Deploy"**
2. Wait 3-5 minutes for build
3. Click the generated URL

---

## STEP 4: TEST DEMO MODE

1. Go to deployed URL
2. Click **"Demo Login"** or **"Use Demo Account"**
3. Select role: Administrator / Doctor / Patient
4. Test features

---

## DEMO MODE LIMITATIONS

✅ **Works:**
- All UI features
- Patient management (in-memory)
- Appointments (in-memory)
- AI scribe (if OPENAI_API_KEY added)
- Voice intake
- Telemedicine UI

❌ **Requires Database:**
- Data persistence (resets on restart)
- Multiple concurrent users
- Production patient data

---

## NEXT: ADD DATABASE

Once demo is working, add PostgreSQL:

1. Go to https://neon.tech
2. Create free database
3. Copy connection string
4. Add to Railway Variables:
   ```
   DATABASE_URL=postgresql://username:password@host/database?sslmode=require
   ```
5. Redeploy

---

## NEXT: ADD AI FEATURES

1. OpenAI: https://platform.openai.com/api-keys
   ```
   OPENAI_API_KEY=sk-your-key
   ```

2. Gemini (cheaper alternative): https://aistudio.google.com/app/apikey
   ```
   GEMINI_API_KEY=AIzaSy-your-key
   ENABLE_GEMINI_AI=true
   ```

3. Redeploy

---

## TROUBLESHOOTING

### Build fails?
Check logs: Project → Deployments → Latest → Logs

### App crashes?
- Check environment variables are set
- Verify NODE_ENV=production
- Check port is not conflicting

### Can't login?
- Verify VITE_ENABLE_LOGIN_BYPASS=true
- Clear browser cookies/cache
- Try incognito mode

### Database errors?
- Normal in demo mode without DATABASE_URL
- Add database when ready for persistence

---

## FEATURES TO TEST

Once deployed, test these:

1. **Demo Login** - All 3 roles
2. **Patient Registry** - Add/edit patients
3. **Appointments** - Schedule, cancel
4. **AI Scribe** - Voice to SOAP notes
5. **Lab Interpreter** - Upload bloodwork
6. **Telemedicine** - Video call UI
7. **Billing** - Invoices, payments

---

## SUPPORT

Reply with:
- "Deployed" → I'll test the URL
- "Build failed" → I'll check logs
- "Add database" → I'll guide Neon setup
- "Add AI" → I'll guide API setup

---

**Ready to deploy! Add those 2 environment variables and click Deploy.**

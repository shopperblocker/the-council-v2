# Vercel API Proxy Debugging Checklist

## ✅ Fixes Applied

1. **Removed vercel.json rewrites** - External URL rewrites don't work reliably on Vercel
2. **Using Next.js API Route** - Catch-all route at `/app/api/[...path]/route.ts`
3. **Force dynamic rendering** - Added `export const dynamic = "force-dynamic"`
4. **Build verification** - Route shows as `ƒ /api/[...path]` in build output

## 🔍 Vercel Deployment Checklist

### 1. Check Vercel Project Settings
- Go to your Vercel project dashboard
- **Project Settings → Root Directory**: Should be `the-council/frontend`
- **Framework Preset**: Should be "Next.js"
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)

### 2. Check Environment Variables
- Go to **Project Settings → Environment Variables**
- Add `NEXT_PUBLIC_BACKEND_URL` = `https://the-council-backend-production-e480.up.railway.app`
- Set for: Production, Preview, Development

### 3. Clear Vercel Cache
After deployment:
```bash
# From Vercel dashboard:
Deployments → [Your deployment] → ... → Redeploy → Clear cache and redeploy
```

### 4. Test the API Route
After deployment, test these URLs:

```bash
# Should proxy to Railway backend
https://your-app.vercel.app/api/agents

# Should return agent list from backend
curl https://your-app.vercel.app/api/agents

# Check if SSE streaming works
curl https://your-app.vercel.app/api/war-room/debate -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"test","agent_names":[]}'
```

### 5. Check Vercel Function Logs
- Go to **Deployments → [Your deployment] → Functions**
- Click on `/api/[...path]` to see logs
- Look for errors or timeout issues

### 6. Verify Build Output
In deployment logs, verify you see:
```
├ ƒ /api/[...path]                       0 B                0 B
```
The `ƒ` indicates it's a serverless function (correct).

## 🐛 Common Issues & Solutions

### Issue: 404 on /api/* routes
**Solution**: Check Root Directory setting in Vercel project settings

### Issue: 500 Internal Server Error
**Solution**: Check Vercel function logs for errors. May need to adjust fetch timeout.

### Issue: CORS errors
**Solution**: Railway backend needs proper CORS headers. Check `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: Timeout errors (524)
**Solution**: Vercel serverless functions have 10s timeout (60s on Pro). For long SSE streams, consider:
- Using Vercel Pro for 60s timeout
- Or deploy frontend elsewhere (Netlify, Cloudflare Pages)

### Issue: SSE stream cuts off
**Solution**: Check if Railway backend is sending proper SSE format:
- Headers must include `Content-Type: text/event-stream`
- Events must follow format: `event: name\ndata: {...}\n\n`

## 📝 File Structure Verification

Ensure this structure:
```
the-council/frontend/
├── app/
│   ├── api/
│   │   └── [...path]/
│   │       └── route.ts ✅ (catches all /api/* requests)
│   ├── war-room/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
├── next.config.mjs ✅ (no rewrites)
├── package.json
└── tsconfig.json
```

## 🚀 After Committing Changes

1. Push to GitHub: `git push`
2. Vercel will auto-deploy
3. Check deployment logs
4. Test API endpoints
5. Check function logs if issues persist

## 💡 Alternative: If Catch-All Still Doesn't Work

If the catch-all route still isn't working, try renaming the directory:

```bash
# Try using parentheses instead of brackets
mv app/api/[...path] app/api/(proxy)
# Then rename route.ts to handle paths differently
```

Or create explicit routes:
```
app/api/war-room/[...slug]/route.ts
app/api/agents/route.ts
```

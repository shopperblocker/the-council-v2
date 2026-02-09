# Step-by-Step Vercel Debugging

## STEP 1: Check Vercel Root Directory (CRITICAL)

1. Go to https://vercel.com/dashboard
2. Click on your project (the-council or similar)
3. Click **Settings** tab
4. Scroll to **Root Directory**
5. **What does it say?**
   - ✅ Should be: `the-council/frontend`
   - ❌ If it says: `.` or empty or `the-council` → THIS IS THE PROBLEM

**If Root Directory is wrong:**
- Click **Edit**
- Type: `the-council/frontend`
- Click **Save**
- Go to **Deployments** → Click **...** on latest → **Redeploy**

---

## STEP 2: Check Latest Deployment Status

1. Go to **Deployments** tab
2. Click on the **topmost** (most recent) deployment
3. Look at the status:
   - ✅ "Ready" with green checkmark = build succeeded
   - ❌ "Error" or "Failed" = build failed

**If build failed:**
- Click on the deployment
- Scroll down to see build logs
- Look for errors (usually in red)
- Copy the error message

---

## STEP 3: Check Build Output for API Route

1. In the deployment page, scroll to the **Build Logs** section
2. Look for a section that says "Route (app)"
3. **Find this line:**
   ```
   ├ ƒ /api/[...path]                       0 B                0 B
   ```

**Questions:**
- Do you see `/api/[...path]` in the build output?
  - ✅ YES → Route is detected, continue to Step 4
  - ❌ NO → Root directory is probably wrong, go back to Step 1

---

## STEP 4: Test the Deployed API Route

1. Copy your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
2. Open a new browser tab
3. Try this URL: `https://your-app.vercel.app/api/agents`

**What happens?**

### A) You see JSON data (list of agents)
- ✅ **IT'S WORKING!** The proxy is fine
- Problem might be in your frontend code calling the API

### B) You see "404: NOT_FOUND"
- ❌ Route not found
- Likely causes:
  1. Root directory is wrong
  2. File structure issue
  3. Deployment didn't include the route

### C) You see "502 Bad Gateway" or "Backend unreachable"
- ✅ Route is working but can't reach Railway
- Railway backend might be down or URL is wrong

### D) You see "500 Internal Server Error"
- ❌ Route crashed
- Need to check function logs (next step)

### E) You see nothing / page hangs / times out
- ❌ Route is timing out
- Need to check function logs (next step)

---

## STEP 5: Check Vercel Function Logs

1. In your deployment page, click the **Functions** tab
2. You should see `/api/[...path]`
3. Click on `/api/[...path]`
4. You'll see a list of function invocations

**If you see NO invocations:**
- Route was never called
- Problem is on frontend (API calls not reaching Vercel)

**If you see invocations:**
- Click on one of them
- Look at the logs
- Copy any error messages you see

---

## STEP 6: Check Browser Network Tab

1. Open your Vercel app: `https://your-app.vercel.app`
2. Open browser DevTools (F12)
3. Go to **Network** tab
4. Click **"Convene"** or submit a question in War Room
5. Watch the Network tab

**Look for a request to `/api/war-room/debate`**

### Request shows up:
- Check the **Status Code**:
  - 200 = Success
  - 404 = Not found (route not working)
  - 500 = Server error
  - 502 = Backend unreachable
  - 524 = Timeout

- Click on the request
- Go to **Headers** tab
- Copy the **Request URL**
- Copy the **Status Code**

### Request doesn't show up:
- Frontend isn't calling the API
- Check browser console for errors

---

## STEP 7: Check Browser Console

1. In DevTools, go to **Console** tab
2. Look for errors (red text)
3. Copy any errors you see

Common errors:
- `CORS error` = Backend CORS not configured for Vercel domain
- `Network error` = Can't reach backend
- `404` = Route not found

---

## REPORT BACK WITH THESE ANSWERS:

**From Step 1:**
- What is your Root Directory set to? __________

**From Step 2:**
- Is your latest deployment "Ready"? YES / NO
- If NO, what error? __________

**From Step 3:**
- Do you see `/api/[...path]` in build logs? YES / NO

**From Step 4:**
- Test URL: `https://_____.vercel.app/api/agents`
- What do you see? (A/B/C/D/E) __________
- Copy exact error message: __________

**From Step 5:**
- Do you see function invocations? YES / NO
- Any error logs? __________

**From Step 6:**
- Does `/api/war-room/debate` request show in Network tab? YES / NO
- Status code: __________
- Request URL: __________

**From Step 7:**
- Any console errors? __________

---

## QUICK DIAGNOSTIC COMMANDS

Run these and report results:

```bash
# Check if file exists locally
ls -la the-council/frontend/app/api/[...path]/route.ts

# Check git status
git status

# Check remote URL
git remote -v

# View recent commits
git log --oneline -5
```

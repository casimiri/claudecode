# OAuth Debug Guide - Facebook Redirect Error

## Error: "URL blocked - redirect URI is not white-listed"

This error occurs when Facebook tries to redirect to an unauthorized URL.

## Root Cause Analysis

The error indicates that Facebook is trying to redirect to:
`https://shiny-engine-467qjw54vwfjjj4-3000.app.github.dev`

But it should redirect to:
`https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback`

## Possible Causes & Solutions

### 1. Site URL Configuration in Supabase

**Check your Supabase Site URL setting:**

1. Go to [Supabase Dashboard](https://app.supabase.com) → Your Project → Settings → API
2. Check the **Site URL** field
3. It should be set to your current application URL:
   ```
   https://shiny-engine-467qjw54vwfjjj4-3000.app.github.dev
   ```

**If Site URL is wrong:**
- Update it to match your current Codespaces URL
- Wait a few minutes for the change to propagate

### 2. Facebook App Configuration

**In Facebook Developer Console:**

1. Go to your app → **Facebook Login** → **Settings**
2. **Valid OAuth Redirect URIs** should ONLY contain:
   ```
   https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback
   ```
3. **Site URL** (in Basic Settings) can be your app URL:
   ```
   https://shiny-engine-467qjw54vwfjjj4-3000.app.github.dev
   ```

### 3. Environment Mismatch

**For Development in Codespaces:**

The OAuth flow should work like this:
1. User clicks Facebook login in your app
2. Redirected to Facebook for authentication
3. Facebook redirects to Supabase: `https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback`
4. Supabase processes the auth and redirects back to your app: `https://shiny-engine-467qjw54vwfjjj4-3000.app.github.dev/auth/callback`

### 4. Quick Test Commands

**Check current configuration:**

```bash
# Check your current origin
echo "Current origin: $(curl -s https://shiny-engine-467qjw54vwfjjj4-3000.app.github.dev | head -1)"

# Verify Supabase is accessible
curl -s "https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback" | head -1
```

### 5. Temporary Workaround

If you need to test Facebook OAuth in development, you can:

1. **Use ngrok** to create a stable tunnel:
   ```bash
   npx ngrok http 3000
   ```
   Use the ngrok HTTPS URL as your Site URL in Supabase

2. **Or test in Production** where the URLs are stable

### 6. Facebook App Settings Checklist

**Basic Settings:**
- ✅ App Name: Local Lawyer AI
- ✅ Site URL: `https://shiny-engine-467qjw54vwfjj4-3000.app.github.dev`
- ✅ Privacy Policy URL: (optional for development)

**Facebook Login Settings:**
- ✅ Valid OAuth Redirect URIs: `https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback`
- ✅ Client OAuth Login: **Yes**
- ✅ Web OAuth Login: **Yes**
- ✅ Use Strict Mode for Redirect URIs: **Yes**

## Debug Steps

1. **First**: Update Supabase Site URL to match your Codespaces URL
2. **Second**: Ensure Facebook app has correct Supabase callback URL
3. **Third**: Test with a fresh browser session (clear cookies)
4. **Fourth**: Check browser network tab to see actual redirect URLs

## Expected OAuth Flow URLs

1. **Start**: `https://shiny-engine-467qjw54vwfjjj4-3000.app.github.dev/en/login`
2. **Facebook**: `https://www.facebook.com/v18.0/dialog/oauth?...`
3. **Supabase**: `https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback`
4. **Return**: `https://shiny-engine-467qjw54vwfjjj4-3000.app.github.dev/auth/callback`

If Facebook is trying to redirect directly to step 4 instead of step 3, then there's a configuration issue in either Facebook app settings or Supabase Site URL.
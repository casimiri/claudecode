# 🚨 CRITICAL DATABASE FIX REQUIRED

## Current Issues

Your application has TWO critical issues caused by database triggers referencing removed subscription fields:

### ❌ Issue 1: Chat Token Deduction Not Working
- **Error**: `record "old" has no field "period_end_date"`
- **Impact**: Users can chat but tokens are not being deducted
- **Cause**: `auto_reset_user_tokens` trigger references removed `period_end_date` field

### ❌ Issue 2: Sign-in Process Failing  
- **Error**: `record "old" has no field "subscription_plan"`
- **Impact**: Users cannot sign in (redirected to error page)
- **Cause**: `handle_new_user()` function references removed `subscription_plan` field

## 🛠️ Solution

Both issues are fixed by the same SQL script that removes old subscription-related triggers and creates clean token-only versions.

### Step-by-Step Fix Instructions

**OPTION 1: Try the Minimal Fix First (Recommended)**

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor** (in left sidebar)

2. **Run the Minimal Fix**
   - Open the file `minimal-trigger-fix.sql` in this directory
   - Copy ALL the contents
   - Paste into Supabase SQL Editor
   - Click **RUN** to execute

3. **Test the Fix**
   - Run: `node test-token-fix.js`
   - If it shows "ALL TESTS PASSED" ✅ **YOU'RE DONE!**

**OPTION 2: If Option 1 Fails, Use the Alternative Fix**

1. **Run the Alternative Fix**
   - Open the file `complete-trigger-fix-v2.sql`
   - Copy ALL the contents  
   - Paste into Supabase SQL Editor
   - Click **RUN** to execute

2. **Test Again**
   - Run: `node test-token-fix.js`
   - Should show: "ALL TESTS PASSED"

## 📝 What the Fix Does

The SQL script:

1. **Drops problematic triggers/functions**:
   - `auto_reset_user_tokens` (causing chat issue)
   - `handle_new_user()` (causing sign-in issue) 
   - `update_updated_at_column()` (may reference old fields)
   - `check_and_reset_expired_periods()` (subscription logic)

2. **Creates clean token-only versions**:
   - New `handle_new_user()` without subscription field references
   - New `update_updated_at_column()` with just timestamp updates
   - Stub `check_and_reset_expired_periods()` for compatibility

3. **Recreates necessary triggers**:
   - `on_auth_user_created` for sign-in process
   - `update_users_updated_at` for timestamp updates

## ✅ Expected Results After Fix

- **Sign-in**: Users can successfully sign in via Google/OAuth
- **Chat**: Token deduction works properly during conversations  
- **Dashboard**: Token balance displays and updates correctly
- **No Errors**: No more database trigger errors in logs

## 🧪 Testing After Fix

Run these commands to verify everything works:

```bash
# Test database functions
node test-token-fix.js

# Test the full application
npm run dev --turbopack
# Then try signing in and using chat
```

## 📊 Current State

- ✅ All subscription code removed from application
- ✅ Frontend converted to token-only system  
- ✅ API routes updated for token-only logic
- ❌ **Database triggers still reference old subscription fields** ← NEEDS FIX
- ❌ **Sign-in fails due to trigger errors** ← NEEDS FIX
- ❌ **Token deduction fails due to trigger errors** ← NEEDS FIX

---

**CRITICAL**: The application cannot function properly until this database fix is applied!
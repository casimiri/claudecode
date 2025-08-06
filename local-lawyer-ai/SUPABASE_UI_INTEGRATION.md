# Supabase UI Integration Documentation

This document explains the complete Next.js UI integration with Supabase Auth and Stripe subscriptions.

## 🚀 Files Created

### Core UI Components
- `pages/subscription-supabase.js` - Main subscription management UI
- `pages/login-supabase.js` - Authentication page with Google/Facebook login
- `pages/_app-supabase.js` - App wrapper with Supabase context
- `middleware-supabase.js` - Middleware for session management

### API Routes
- `pages/api/subscription-auth.js` - Get user subscription with Supabase Auth

## 📦 Required Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "@supabase/auth-helpers-react": "^0.4.2",
    "@supabase/supabase-js": "^2.38.4",
    "react-toastify": "^9.1.3",
    "lucide-react": "^0.294.0"
  }
}
```

Install with:
```bash
npm install @supabase/auth-helpers-nextjs @supabase/auth-helpers-react @supabase/supabase-js react-toastify lucide-react
```

## 🔧 Setup Instructions

### 1. Environment Variables
Create/update `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Stripe (frontend)
NEXT_PUBLIC_STRIPE_PRICE_WEEKLY=price_weekly_id
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_monthly_id
NEXT_PUBLIC_STRIPE_PRICE_YEARLY=price_yearly_id
```

### 2. Replace _app.js
Replace your `pages/_app.js` with `pages/_app-supabase.js` content or merge the SessionContextProvider.

### 3. Add Middleware
Replace/create `middleware.js` with `middleware-supabase.js` content.

### 4. Update API Routes
Update your API routes to use the new auth-enabled versions:
- Use `pages/api/subscription-auth.js` for GET /api/subscription
- Ensure your POST routes validate authentication

## 🗄️ Database Schema

Ensure your Supabase `users` table has these columns:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_price_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_plan TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data (for webhooks)
CREATE POLICY "Service role can update users" ON users
  FOR ALL USING (true);
```

## 🔐 Supabase Auth Setup

### 1. Enable Providers
In Supabase Dashboard → Authentication → Providers:

**Google:**
- Enable Google provider
- Add your Google OAuth client ID and secret
- Set redirect URL: `https://yourdomain.com/auth/callback`

**Facebook:**
- Enable Facebook provider  
- Add your Facebook app ID and secret
- Set redirect URL: `https://yourdomain.com/auth/callback`

### 2. Site URL Configuration
In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://yourdomain.com`
- Redirect URLs: `https://yourdomain.com/auth/callback`

## 🎨 UI Features

### Subscription Management (`/subscription-supabase`)
- ✅ **Authentication Check**: Redirects to login if not authenticated
- ✅ **Plan Display**: Shows 4 plans (Free, Weekly, Monthly, Yearly)
- ✅ **Current Plan Highlighting**: Visual indicator of active subscription
- ✅ **Tier-Based Logic**: Prevents downgrades, allows upgrades
- ✅ **Subscribe/Upgrade**: Calls API and redirects to Stripe Checkout
- ✅ **Cancel Subscription**: Modal confirmation with proper messaging
- ✅ **Loading States**: Spinners and disabled states during operations
- ✅ **Toast Notifications**: Success/error feedback
- ✅ **Responsive Design**: Mobile-friendly Tailwind CSS

### Authentication (`/login-supabase`)
- ✅ **Social Login**: Google and Facebook OAuth
- ✅ **Auto-redirect**: Redirects to subscription page after login
- ✅ **User Status**: Shows current user info if already logged in
- ✅ **Sign Out**: Logout functionality
- ✅ **Loading States**: Button loading indicators

## 🔄 User Flow

### New User Flow
1. **Visit subscription page** → Redirected to `/login-supabase`
2. **Click Google/Facebook login** → OAuth flow
3. **OAuth callback** → User created in `auth.users`
4. **Webhook/trigger** → User record created in custom `users` table
5. **Redirected to subscription** → See plans with "Free" as current

### Subscription Flow
1. **User clicks Subscribe/Upgrade** → API call to `/api/subscribe`
2. **API creates Stripe checkout** → Returns checkout URL
3. **Redirect to Stripe** → User completes payment
4. **Stripe webhook** → Updates `users` table with subscription data
5. **User returns** → Sees updated subscription status

### Cancellation Flow
1. **User clicks Cancel** → Confirmation modal appears
2. **Confirms cancellation** → API call to `/api/cancel-subscription`
3. **Stripe cancels subscription** → Sets `cancel_at_period_end: true`
4. **User sees updated status** → Subscription shows as "will cancel"
5. **Period ends** → Webhook resets user to free plan

## 🧪 Testing

### Local Development
```bash
# Start development server
npm run dev

# Visit pages
http://localhost:3000/login-supabase
http://localhost:3000/subscription-supabase
```

### Authentication Test
1. Visit `/subscription-supabase` without being logged in
2. Should redirect to `/login-supabase`
3. Login with Google/Facebook
4. Should redirect back to subscription page
5. Should see plans with Free as current plan

### Subscription Test
1. Login and visit subscription page
2. Click subscribe on a paid plan
3. Should redirect to Stripe Checkout
4. Complete test payment
5. Return to site - should see updated plan

## 🛡️ Security Features

- ✅ **Row Level Security**: Users can only access their own data
- ✅ **Authentication Required**: All subscription operations require login
- ✅ **CSRF Protection**: Supabase Auth handles CSRF tokens
- ✅ **Session Management**: Automatic session refresh
- ✅ **Secure Redirects**: Validated redirect URLs

## 📱 Responsive Design

The UI is fully responsive using Tailwind CSS:
- **Mobile**: Stacked plan cards, full-width buttons
- **Tablet**: 2-column grid layout
- **Desktop**: 4-column grid with hover effects
- **Interactive**: Loading states, hover effects, smooth transitions

## 🚨 Error Handling

- **Network Errors**: Toast notifications with retry options
- **Authentication Errors**: Automatic redirect to login
- **API Errors**: Clear error messages displayed to user
- **Validation Errors**: Client-side validation with feedback
- **Stripe Errors**: Proper error handling from Stripe responses

The integration provides a complete, production-ready subscription management system with Supabase Auth and Stripe billing.
# Supabase + Stripe Integration Documentation

This document explains the complete integration between Supabase Auth, Supabase Database, and Stripe for subscription management.

## 🗄️ Database Schema

### Custom Users Table (Supabase)

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

-- Policy to allow users to read their own data
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy to allow users to update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

## 🔌 API Endpoints

### 1. POST /api/webhook-supabase.js
**Stripe Webhook Handler** - Syncs Stripe events with Supabase

**Events Handled:**
- `checkout.session.completed` - New subscription created
- `customer.subscription.updated` - Subscription modified
- `customer.subscription.deleted` - Subscription canceled

**Flow:**
1. Verify webhook signature
2. Find user in Supabase by `stripe_customer_id` or `email`
3. Update user record with subscription data
4. Log success/failure

### 2. POST /api/subscribe-supabase.js
**Create/Upgrade Subscription**

**Request:**
```json
{
  "email": "user@example.com",
  "priceId": "price_1ABC123weekly"
}
```

**Flow:**
1. Find user in Supabase by email
2. Check upgrade/downgrade rules
3. Create Stripe checkout session or upgrade existing subscription
4. Return checkout URL or success message

### 3. POST /api/cancel-subscription-supabase.js
**Cancel Subscription**

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Flow:**
1. Find user in Supabase
2. Set `cancel_at_period_end: true` in Stripe
3. User retains access until period ends
4. Webhook will update status when actually canceled

### 4. GET /api/get-subscription-supabase.js
**Get Current Subscription**

**Request:**
```
GET /api/get-subscription-supabase?email=user@example.com
```

**Response:**
```json
{
  "priceId": "price_1ABC123monthly",
  "status": "active",
  "plan": "monthly",
  "tier": 2,
  "subscriptionId": "sub_1ABC123",
  "customerId": "cus_ABC123"
}
```

## 🔄 Event Flow

### New Subscription Flow
1. **User clicks subscribe** → Frontend calls `/api/subscribe-supabase`
2. **API creates checkout** → Redirects to Stripe Checkout
3. **User completes payment** → Stripe fires `checkout.session.completed`
4. **Webhook processes event** → Updates Supabase users table
5. **Frontend refreshes** → Shows updated subscription status

### Subscription Update Flow
1. **Stripe subscription changes** → Fires `customer.subscription.updated`
2. **Webhook processes event** → Updates Supabase users table
3. **User sees changes** → Next page load shows updated status

### Cancellation Flow
1. **User cancels subscription** → Frontend calls `/api/cancel-subscription-supabase`
2. **API sets cancel_at_period_end** → Stripe schedules cancellation
3. **Period ends** → Stripe fires `customer.subscription.deleted`
4. **Webhook processes event** → Resets user to free plan in Supabase

## 🔐 Environment Variables

### Required Variables
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_WEEKLY=price_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 🛡️ Security Features

### Webhook Security
- ✅ Stripe signature verification
- ✅ Event idempotency handling
- ✅ Error logging without Stripe retries

### Database Security
- ✅ Row Level Security (RLS) policies
- ✅ Service role for webhook operations
- ✅ User-specific data access

### API Security
- ✅ Email validation
- ✅ Price ID validation
- ✅ Business rule enforcement (no downgrades)

## 🧪 Testing

### Test Webhook Locally
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/webhook-supabase

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

### Test API Endpoints
```bash
# Test subscription creation
curl -X POST http://localhost:3000/api/subscribe-supabase \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","priceId":"price_1ABC123weekly"}'

# Test getting subscription
curl "http://localhost:3000/api/get-subscription-supabase?email=test@example.com"

# Test cancellation
curl -X POST http://localhost:3000/api/cancel-subscription-supabase \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 🔧 Integration Points

### Frontend Integration
```javascript
// Get current user's subscription
const response = await fetch(`/api/get-subscription-supabase?email=${userEmail}`);
const subscription = await response.json();

// Subscribe to new plan
const response = await fetch('/api/subscribe-supabase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: userEmail, priceId: selectedPriceId })
});

// Cancel subscription
const response = await fetch('/api/cancel-subscription-supabase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: userEmail })
});
```

### User Registration Flow
1. User signs up with Google/Facebook → Supabase Auth
2. Trigger creates record in custom users table
3. Email from auth.users copied to custom users table
4. Subscription data fields start as null/free

## 📊 Data Consistency

### Stripe as Source of Truth
- Webhook events keep Supabase in sync with Stripe
- Any Stripe changes automatically update Supabase
- Supabase queries for display, Stripe for billing operations

### Error Handling
- Webhook failures logged but return 200 (prevent retries)
- API failures return proper HTTP status codes
- Database operations wrapped in try/catch blocks

## 🚀 Deployment

### Stripe Configuration
1. Create webhook endpoint: `https://yourdomain.com/api/webhook-supabase`
2. Select events: `checkout.session.completed`, `customer.subscription.*`
3. Copy webhook secret to environment variables

### Supabase Configuration
1. Create custom users table with schema above
2. Set up RLS policies for user data protection
3. Configure environment variables with service role key

The integration is now ready for production with proper error handling, security measures, and data consistency between Stripe and Supabase.
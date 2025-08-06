# Token Purchase System Implementation

## Overview

The buy-tokens system has been fully implemented with the following components:

### 🎯 Features Implemented

1. **Token Purchase Frontend** (`/buy-tokens`)
   - 4 token packages: Starter (10K), Popular (50K), Power (150K), Enterprise (500K) 
   - Responsive card-based UI with pricing and features
   - Success/cancellation handling from Stripe redirects
   - Loading states and user authentication

2. **Payment Processing**
   - Stripe Checkout integration for one-time payments
   - Customer creation and management
   - Secure token purchase API endpoint

3. **Webhook Processing**
   - Handles `checkout.session.completed` events
   - Automatic token balance updates via database functions
   - Purchase history tracking

4. **Database Schema**
   - `token_purchases` table for purchase tracking
   - `process_token_purchase()` function for atomic operations
   - User token balance management

## 🚀 Setup Instructions

### 1. Database Migration

Run the token purchase migration:

```sql
-- Execute the contents of token-purchase-migration.sql in your Supabase dashboard
-- This creates tables, functions, and RLS policies
```

### 2. Stripe Products Setup

Create Stripe products and prices:

```bash
# Install dependencies first
npm install

# Create Stripe products (requires STRIPE_SECRET_KEY in .env.local)
node scripts/create-stripe-products.js
```

This will output price IDs to add to your `.env.local` file.

### 3. Environment Variables

Update `.env.local` with the generated price IDs:

```env
# Token Purchase Price IDs (replace with actual Stripe price IDs)
NEXT_PUBLIC_STRIPE_PRICE_TOKENS_STARTER=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_TOKENS_POPULAR=price_xxxxxxxxxxxxx  
NEXT_PUBLIC_STRIPE_PRICE_TOKENS_POWER=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_TOKENS_ENTERPRISE=price_xxxxxxxxxxxxx

# Webhook endpoint (set in Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 4. Stripe Webhook Configuration

1. Go to Stripe Dashboard → Webhooks
2. Create new webhook endpoint: `https://yourdomain.com/api/webhook-tokens`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## 📊 Token Packages

| Package | Tokens | Price | Value per Token | Savings |
|---------|--------|-------|----------------|---------|
| Starter | 10,000 | $9 | $0.0009 | - |
| Popular | 50,000 | $39 | $0.00078 | 13% |
| Power | 150,000 | $99 | $0.00066 | 27% |
| Enterprise | 500,000 | $299 | $0.000598 | 33% |

## 🔄 Purchase Flow

1. User selects token package on `/buy-tokens`
2. API creates Stripe checkout session (`/api/buy-tokens`)
3. User completes payment on Stripe
4. Webhook processes purchase (`/api/webhook-tokens`)
5. Database function adds tokens to user balance
6. User redirected back with success message

## 🗄️ Database Functions

### `process_token_purchase()`
Atomically processes token purchases:
- Creates purchase record
- Updates user token balance
- Logs transaction in usage history
- Returns success/failure status

### `get_user_token_summary()`
Returns comprehensive token statistics:
- Remaining tokens
- Usage percentage
- Purchase history
- Total purchased

## 🛡️ Security Features

- User authentication required for purchases
- Email validation against authenticated user
- Row Level Security (RLS) policies
- Atomic database transactions
- Webhook signature verification

## 🧪 Testing

1. **Frontend Testing**
   - Visit `/buy-tokens` while logged in
   - Test all package selections
   - Verify loading states and error handling

2. **Payment Testing**
   - Use Stripe test cards (4242 4242 4242 4242)
   - Test success and cancellation flows
   - Verify token balance updates

3. **Webhook Testing**
   - Use Stripe CLI for local testing
   - Monitor webhook delivery in Stripe Dashboard
   - Check database for proper token allocation

## 📝 Routes and API Endpoints

### Frontend Routes
- `/en/buy-tokens` - Token purchase page (App Router with locale support)
- `/en/login` - User authentication 
- `/en/dashboard` - User dashboard with token usage

### API Endpoints  
- `POST /api/buy-tokens` - Creates Stripe checkout session
- `POST /api/webhook-tokens` - Processes Stripe webhooks
- `GET /api/tokens/usage` - Returns user token statistics

**Note**: The buy-tokens system has been migrated to Next.js App Router with internationalization support.

## 🔍 Monitoring

Monitor the following for successful implementation:

1. **Stripe Dashboard**: Payment completion rates
2. **Database Logs**: Token purchase processing
3. **Application Logs**: API endpoint responses
4. **User Feedback**: Success/error message display

## 🐛 Troubleshooting

**Common Issues:**

1. **Missing Price IDs**: Run the Stripe products script
2. **Webhook Failures**: Check webhook secret and endpoint URL
3. **Database Errors**: Ensure migration was applied correctly
4. **Token Not Added**: Check webhook processing logs

**Debug Commands:**

```bash
# Check Stripe products
stripe products list

# Test webhook locally
stripe listen --forward-to localhost:3000/api/webhook-tokens

# Check database functions
SELECT * FROM get_user_token_summary('user-uuid-here');
```

## ✅ Implementation Complete

The token purchase system is now fully functional with:
- ✅ Frontend UI with 4 token packages
- ✅ Stripe integration for payments
- ✅ Webhook processing for token allocation
- ✅ Database schema and functions
- ✅ Security and error handling
- ✅ Success/cancellation handling
- ✅ Environment configuration
- ✅ Setup documentation

Users can now purchase tokens that never expire and use them for AI legal consultations!
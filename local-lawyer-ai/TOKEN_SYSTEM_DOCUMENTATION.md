# Token-Based Pricing System Documentation

This document outlines the complete token-based pricing system that replaces the subscription model.

## 🪙 System Overview

The application now uses a **one-time token purchase** model instead of recurring subscriptions:

- **Tokens never expire** - purchased tokens stay in user's balance forever
- **One-time payments** - no recurring billing or subscriptions  
- **Flexible usage** - users buy tokens as needed
- **Bulk discounts** - larger packages offer better per-token value

## 💰 Token Packages

| Package | Tokens | Price | Per Token | Savings |
|---------|--------|-------|-----------|---------|
| **Starter Pack** | 10,000 | $9 | $0.0009 | - |
| **Popular Pack** | 50,000 | $39 | $0.00078 | 13% |
| **Power Pack** | 150,000 | $99 | $0.00066 | 27% |
| **Enterprise Pack** | 500,000 | $299 | $0.000598 | 33% |

## 🏗️ Technical Architecture

### **Database Schema Changes**

#### New Tables:
```sql
-- Track individual token purchases
token_purchases (
  id, user_id, stripe_session_id, tokens_purchased, 
  amount_paid, package_name, purchase_status, created_at
)

-- Token package configurations  
token_packages (
  package_id, name, tokens, price_cents, 
  stripe_price_id, savings_percentage
)
```

#### Updated Tables:
```sql
-- Enhanced users table
users (
  -- Existing columns...
  total_tokens_purchased INTEGER,
  tokens_purchase_history JSONB,
  -- tokens_limit now represents total token balance
  -- tokens_used_this_period tracks current usage
)

-- Enhanced token_usage_logs
token_usage_logs (
  -- Existing columns...
  purchase_id UUID,
  transaction_type TEXT -- 'usage', 'purchase', 'refund', 'bonus'
)
```

### **API Endpoints**

#### **Token Purchase**
- **Endpoint**: `POST /api/buy-tokens`
- **Purpose**: Create Stripe checkout session for token purchase
- **Body**: `{ email, priceId, tokens, packageName }`
- **Response**: `{ url, sessionId, message }`

#### **Token Balance**
- **Endpoint**: `GET /api/tokens-usage`  
- **Purpose**: Get user's current token balance and usage
- **Response**: 
```json
{
  "tokens_remaining": 45000,
  "tokens_used": 5000, 
  "tokens_limit": 50000,
  "total_purchased": 60000,
  "purchase_count": 2,
  "last_purchase_date": "2024-01-15T10:30:00Z",
  "usage_percentage": 10.0
}
```

#### **Webhook Handler**
- **Endpoint**: `POST /api/webhook-tokens`
- **Purpose**: Process Stripe webhook events for token purchases
- **Events**: `checkout.session.completed`, `payment_intent.succeeded`

### **Database Functions**

#### **process_token_purchase()**
```sql
-- Atomically processes completed token purchase
SELECT process_token_purchase(
  p_user_id := 'uuid',
  p_stripe_session_id := 'session_id', 
  p_tokens_purchased := 50000,
  p_amount_paid := 39.00,
  p_package_name := 'Popular Pack'
);
```

#### **get_user_token_summary()**
```sql
-- Returns comprehensive token usage summary
SELECT * FROM get_user_token_summary('user_uuid');
```

## 🎨 Frontend Implementation

### **Updated UI Components**

#### **TokenPackageCard Component**
- Displays token package details (tokens, price, savings)
- Shows per-token value and discount percentage
- "Buy Tokens" action instead of subscription

#### **Token Balance Display**
- Shows current available tokens
- Displays usage statistics
- Purchase history tracking

#### **Pricing Page Layout**
```
┌─────────────────────────────────────┐
│           Buy Tokens                │
│   Purchase packages that never      │
│           expire                    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│     Current Balance: 45,000         │
│        (Used: 5,000)                │
└─────────────────────────────────────┘
┌─[Starter]─┬─[Popular]─┬─[Power]─────┐
│  10,000   │  50,000   │  150,000    │
│    $9     │   $39     │    $99      │
│           │ Save 13%  │  Save 27%   │
└───────────┴───────────┴─────────────┘
```

## 🔧 Environment Variables

### **Required Stripe Configuration**
```bash
# Stripe Secret Key
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret for token purchases
STRIPE_WEBHOOK_SECRET=whsec_...

# Token Package Price IDs (create in Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PRICE_TOKENS_STARTER=price_...
NEXT_PUBLIC_STRIPE_PRICE_TOKENS_POPULAR=price_...  
NEXT_PUBLIC_STRIPE_PRICE_TOKENS_POWER=price_...
NEXT_PUBLIC_STRIPE_PRICE_TOKENS_ENTERPRISE=price_...
```

### **Stripe Product Setup**
1. Create 4 products in Stripe Dashboard:
   - "Starter Pack - 10,000 Tokens" - $9.00 one-time
   - "Popular Pack - 50,000 Tokens" - $39.00 one-time  
   - "Power Pack - 150,000 Tokens" - $99.00 one-time
   - "Enterprise Pack - 500,000 Tokens" - $299.00 one-time

2. Configure webhook endpoint: `/api/webhook-tokens`
3. Subscribe to events: `checkout.session.completed`, `payment_intent.succeeded`

## 🔄 Migration Process

### **Database Migration**
```bash
# Run the token purchase migration
psql -f token-purchase-migration.sql

# This will:
# - Add new tables and columns
# - Create database functions  
# - Set up RLS policies
# - Insert default token packages
```

### **Existing Users**
- Current subscription users keep their token limits
- Token balance = current `tokens_limit` from subscription
- Future purchases add to this balance
- No disruption to existing token usage

## 🧪 Testing

### **Test Flow**
1. **Access UI**: Visit `/subscription-supabase`
2. **Token Balance**: Should show current tokens (if any)
3. **Purchase Flow**: 
   - Click "Buy Tokens" on any package
   - Redirected to Stripe Checkout
   - Complete test payment
   - Webhook processes purchase
   - Balance updates immediately
4. **Verification**: Check database for purchase record

### **Database Queries for Testing**
```sql
-- Check user token balance
SELECT * FROM user_token_balances WHERE email = 'test@example.com';

-- View purchase history  
SELECT * FROM token_purchases WHERE user_id = 'uuid' ORDER BY created_at DESC;

-- Check token usage logs
SELECT * FROM token_usage_logs WHERE user_id = 'uuid' ORDER BY created_at DESC;
```

## 🔍 Monitoring & Analytics

### **Key Metrics**
- **Revenue per Token**: Track average revenue per token across packages
- **Package Popularity**: Monitor which packages sell most
- **Token Utilization**: Percentage of purchased tokens actually used
- **Purchase Frequency**: How often users buy additional tokens

### **Dashboard Queries**
```sql
-- Revenue by package
SELECT package_name, COUNT(*), SUM(amount_paid) 
FROM token_purchases 
WHERE purchase_status = 'completed'
GROUP BY package_name;

-- Token utilization rates
SELECT 
  AVG(usage_percentage) as avg_utilization,
  COUNT(*) as active_users
FROM user_token_balances 
WHERE tokens_limit > 0;
```

## 🚀 Benefits of Token System

1. **User Benefits**:
   - No recurring charges or billing surprises
   - Tokens never expire - use at your own pace
   - Bulk purchase discounts for heavy users
   - Transparent per-token pricing

2. **Business Benefits**:
   - Higher revenue per user (upfront payments)
   - Reduced churn (no monthly cancellations)
   - Better cash flow (immediate payment)
   - Simplified billing (no proration, downgrades)

3. **Technical Benefits**:
   - Simpler subscription management
   - No recurring billing logic needed
   - Easier webhook handling (one-time events)
   - Clear usage tracking and limits

The token-based system provides a more flexible and user-friendly approach to pricing while simplifying the technical implementation and improving business metrics.
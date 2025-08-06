# Stripe Integration API Documentation

This document describes the new Stripe integration API endpoints for subscription management.

## Environment Variables Required

```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_WEEKLY=price_your_weekly_price_id
STRIPE_PRICE_MONTHLY=price_your_monthly_price_id
STRIPE_PRICE_YEARLY=price_your_yearly_price_id
```

## Plan Structure

The system supports 4 plans with a tier hierarchy:

- **Free** (tier 0): No Stripe billing
- **Weekly** (tier 1): $7/week 
- **Monthly** (tier 2): $25/month
- **Yearly** (tier 3): $250/year

## API Endpoints

### 1. POST /api/subscribe

Creates a new subscription or upgrades an existing one.

**Request Body:**
```json
{
  "email": "user@example.com",
  "priceId": "price_1ABC123weekly"
}
```

**Responses:**

**Success - New Subscription:**
```json
{
  "success": true,
  "message": "Creating weekly subscription",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/...",
  "sessionId": "cs_test_...",
  "action": "create"
}
```

**Success - Upgrade:**
```json
{
  "success": true,
  "message": "Successfully upgraded from weekly to monthly",
  "subscriptionId": "sub_...",
  "priceId": "price_1ABC123monthly",
  "action": "upgrade"
}
```

**Error - Downgrade Attempt:**
```json
{
  "error": "Cannot downgrade from monthly to weekly. Downgrades are not allowed.",
  "currentPlan": "monthly",
  "requestedPlan": "weekly"
}
```

**Error Responses:**
- `400`: Invalid input, downgrade attempt, or invalid priceId
- `500`: Internal server error

### 2. POST /api/cancel-subscription

Cancels a user's subscription at the end of their billing period.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "monthly subscription will be canceled at the end of the billing period",
  "subscriptionId": "sub_...",
  "currentPlan": "monthly",
  "cancelAtPeriodEnd": true,
  "accessUntil": "2024-01-15T12:00:00.000Z",
  "cancelDate": "1/15/2024",
  "billingPeriodEnd": "2024-01-15T12:00:00.000Z"
}
```

**Error Responses:**
- `400`: No active subscription, already canceled, or invalid email
- `404`: User not found
- `500`: Internal server error

### 3. POST /api/webhook

Handles Stripe webhook events. This endpoint should be configured in your Stripe dashboard.

**Webhook Events Handled:**
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`

**Response:**
```json
{
  "success": true,
  "eventType": "customer.subscription.created",
  "message": "Webhook processed successfully"
}
```

## Business Logic

### Upgrade Rules
- Users can upgrade from any lower tier to a higher tier
- Upgrades are processed immediately with prorated billing
- Tier order: free < weekly < monthly < yearly

### Downgrade Rules
- Downgrades are **not allowed**
- API will return an error if downgrade is attempted
- Users must cancel their subscription and manually subscribe to a lower tier

### Cancellation Rules
- Cancellation is always allowed
- Subscriptions are canceled at the end of the billing period (`cancel_at_period_end: true`)
- Users retain access until the period ends
- After cancellation, users are moved to the free tier

## In-Memory Database

The system maintains an in-memory Map with the following structure:

```javascript
{
  "user@example.com": {
    "customerId": "cus_stripe_customer_id",
    "subscriptionId": "sub_stripe_subscription_id", 
    "priceId": "price_stripe_price_id",
    "status": "active"
  }
}
```

## Testing the API

### Example cURL Commands

**Subscribe to Weekly Plan:**
```bash
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "priceId": "price_1ABC123weekly"
  }'
```

**Upgrade to Monthly:**
```bash
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com", 
    "priceId": "price_1ABC123monthly"
  }'
```

**Cancel Subscription:**
```bash
curl -X POST http://localhost:3000/api/cancel-subscription \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

## Error Handling

All endpoints return appropriate HTTP status codes and JSON error messages:

- **400 Bad Request**: Invalid input, business rule violations
- **404 Not Found**: User not found  
- **405 Method Not Allowed**: Wrong HTTP method
- **500 Internal Server Error**: Stripe API errors, server issues

## Stripe Dashboard Configuration

1. Create products and prices for weekly, monthly, and yearly plans
2. Configure webhook endpoint: `https://yourdomain.com/api/webhook`
3. Select events: `customer.subscription.*`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`
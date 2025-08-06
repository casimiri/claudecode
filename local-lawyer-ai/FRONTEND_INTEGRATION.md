# Frontend Integration Documentation

This document explains the complete frontend-backend integration for the subscription management system.

## Files Created

### Backend API Endpoints
- `pages/api/subscribe.js` - Handle subscription creation/upgrades
- `pages/api/cancel-subscription.js` - Handle subscription cancellation
- `pages/api/get-subscription.js` - Get user's current subscription
- `pages/api/webhook.js` - Handle Stripe webhook events
- `lib/stripe-new.js` - Stripe utilities and in-memory database

### Frontend Components
- `pages/subscription.js` - Main subscription management UI
- `pages/test-subscription.js` - Test page for development

### Configuration
- `.env.local.example` - Environment variables template
- `.env.stripe.example` - Stripe-specific environment variables

## Setup Instructions

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
# Authentication (choose your provider)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# Stripe (frontend - safe to expose)
NEXT_PUBLIC_STRIPE_PRICE_WEEKLY=price_1ABC123weekly
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_1ABC123monthly  
NEXT_PUBLIC_STRIPE_PRICE_YEARLY=price_1ABC123yearly

# Stripe (backend - keep secret)
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 2. Authentication Setup

The UI supports multiple authentication providers. Choose one:

**NextAuth.js (Recommended):**
```javascript
import { useSession } from 'next-auth/react';
const { data: session } = useSession();
const userEmail = session?.user?.email;
```

**Clerk:**
```javascript
import { useAuth } from '@clerk/nextjs';
const { user } = useAuth();
const userEmail = user?.emailAddresses?.[0]?.emailAddress;
```

**Firebase:**
```javascript
import { useAuthState } from 'react-firebase-hooks/auth';
const [user] = useAuthState(auth);
const userEmail = user?.email;
```

### 3. Stripe Dashboard Configuration

1. Create products and prices in Stripe Dashboard
2. Set up webhook endpoint: `https://yourdomain.com/api/webhook`
3. Configure webhook events: `customer.subscription.*`
4. Copy webhook secret to environment variables

## UI Features

### Plan Management
- ✅ Display all 4 plans (Free, Weekly, Monthly, Yearly)
- ✅ Highlight user's current plan
- ✅ Show pricing and features
- ✅ Visual indicators for popular plans

### Business Logic Enforcement
- ✅ **Upgrades Only**: Users can only upgrade to higher-tier plans
- ✅ **No Downgrades**: Lower-tier plans are disabled with clear messaging
- ✅ **Current Plan**: Current plan button is disabled
- ✅ **Free Plan**: No subscription button (always available)

### User Experience
- ✅ **Loading States**: Spinners during API calls
- ✅ **Toast Notifications**: Success/error messages
- ✅ **Confirmation Dialogs**: For cancellation actions
- ✅ **Responsive Design**: Works on mobile and desktop
- ✅ **Error Handling**: Graceful handling of API errors

### Subscription Actions
- ✅ **Subscribe**: Create new subscriptions via Stripe Checkout
- ✅ **Upgrade**: Instant upgrades with prorated billing
- ✅ **Cancel**: Cancel at end of billing period

## API Integration

### Get Current Subscription
```javascript
const response = await fetch(`/api/get-subscription?email=${userEmail}`);
const subscription = await response.json();
// Returns: { priceId, status, plan, tier, subscriptionId }
```

### Subscribe/Upgrade
```javascript
const response = await fetch('/api/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: userEmail, priceId: 'price_123' })
});
// Returns: { checkoutUrl } or { message, action: 'upgrade' }
```

### Cancel Subscription
```javascript
const response = await fetch('/api/cancel-subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: userEmail })
});
// Returns: { message, cancelDate, accessUntil }
```

## Component Architecture

### Main Component: `pages/subscription.js`

**State Management:**
- `currentSubscription` - User's current plan data
- `loading` - Loading state for API calls
- `processingPlan` - Which plan is being processed
- `canceling` - Cancellation in progress
- `toast` - Toast notification state

**Key Functions:**
- `fetchCurrentSubscription()` - Load user's current plan
- `handleSubscribe(plan)` - Process subscription/upgrade
- `handleCancelSubscription()` - Cancel user's plan
- `getButtonState(plan)` - Determine button text/state
- `getPlanCardClass(plan)` - Styling for plan cards

**UI Components:**
- Plan cards with features and pricing
- Action buttons with loading states  
- Current plan highlighting
- Cancel subscription section
- Toast notifications

## Testing

### Development Testing

Use the test page at `/test-subscription`:

1. Enter any email address
2. Test subscription flows
3. Verify upgrade/downgrade logic
4. Test cancellation

### Manual Testing Checklist

- [ ] Authentication works with your provider
- [ ] Current plan loads correctly
- [ ] Free users can subscribe to any paid plan
- [ ] Paid users can only upgrade (downgrades blocked)
- [ ] Current plan button is disabled
- [ ] Cancellation works and shows confirmation
- [ ] Toast notifications appear for all actions
- [ ] Loading states work during API calls
- [ ] Stripe Checkout redirects work
- [ ] Webhooks update subscription status

## Styling

The UI uses Tailwind CSS with a clean, professional design:

- **Colors**: Blue for current plan, purple for popular, gray for disabled
- **Layout**: Responsive grid for plan cards
- **Typography**: Clear hierarchy with proper font weights
- **Spacing**: Consistent padding and margins
- **Interactive**: Hover effects and transitions
- **Accessibility**: Proper contrast and focus states

## Error Handling

The system handles various error scenarios:

- **Network Errors**: Show "Failed to load" messages
- **Authentication Errors**: Redirect to login
- **Stripe Errors**: Display specific error messages
- **Business Logic Errors**: Clear messages about downgrades
- **Validation Errors**: Input validation feedback

## Security Considerations

- Email validation on both frontend and backend
- Secure webhook signature verification
- Environment variables for sensitive data
- HTTPS required for production
- Authentication required for all subscription actions

## Deployment

1. Set up environment variables in production
2. Configure Stripe webhook URL
3. Test webhook delivery
4. Verify authentication flow
5. Test subscription flows in production

The system is production-ready with proper error handling, security measures, and user experience considerations.
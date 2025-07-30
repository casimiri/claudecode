# Local Lawyer AI Assistant

A Next.js SaaS application that provides AI-powered legal assistance based on up-to-date local law documents. Users can subscribe to access an AI assistant trained on legal documents uploaded by administrators.

## Features

### User Features
- **OAuth Authentication**: Sign in with Google or Facebook
- **Flexible Subscriptions**: Weekly, monthly, or yearly plans via Stripe
- **AI Legal Assistant**: Chat interface powered by OpenAI GPT-4
- **Document-Based Responses**: AI responses based on latest legal documents
- **Subscription Management**: View billing info and manage subscriptions

### Admin Features
- **Secure Admin Login**: Protected admin authentication
- **Document Management**: Upload and manage legal documents (PDF, DOCX, TXT)
- **Document Processing**: Automatic text extraction and vector embedding
- **Version Control**: Track document versions and manage current versions
- **User Analytics**: View user statistics and subscription data

### Technical Features
- **Vector Search**: RAG (Retrieval-Augmented Generation) with PGVector
- **Scalable Architecture**: Built with Next.js and Supabase
- **Real-time Processing**: Automatic document indexing for AI queries
- **Secure Storage**: File storage with Supabase Storage
- **GDPR Compliant**: Privacy-focused data handling

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Authentication**: Supabase Auth (OAuth)
- **Database**: Supabase PostgreSQL with PGVector
- **AI**: OpenAI GPT-4 with embeddings
- **Payments**: Stripe
- **File Storage**: Supabase Storage
- **Deployment**: Vercel (recommended)

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key
- Stripe account
- Google OAuth app (optional)
- Facebook OAuth app (optional)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd local-lawyer-ai
npm install
```

### 2. Environment Variables

Copy `.env.local` and fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth (optional)
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-admin-password
```

### 3. Database Setup

1. **Enable PGVector** in your Supabase project:
   - Go to Database → Extensions
   - Enable the `vector` extension

2. **Run the SQL setup**:
   - Go to Database → SQL Editor
   - Copy and paste the contents of `supabase-setup.sql`
   - Execute the SQL

3. **Create Storage Bucket**:
   - Go to Storage → Create bucket
   - Name: `legal-documents`
   - Make it private

### 4. Stripe Setup

1. **Create Products** in Stripe Dashboard:
   - Weekly plan: $9.99/week
   - Monthly plan: $29.99/month
   - Yearly plan: $299.99/year

2. **Add Price IDs** to your environment variables:
   ```bash
   STRIPE_WEEKLY_PRICE_ID=price_xxx
   STRIPE_MONTHLY_PRICE_ID=price_xxx
   STRIPE_YEARLY_PRICE_ID=price_xxx
   ```

3. **Configure Webhooks**:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 5. OAuth Setup (Optional)

#### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

#### Facebook OAuth:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure redirect URIs similar to Google

### 6. Admin User Setup

1. **Hash your admin password**:
   ```javascript
   const bcrypt = require('bcrypt');
   const hash = bcrypt.hashSync('your-password', 10);
   console.log(hash);
   ```

2. **Update the admin record** in `supabase-setup.sql` with your hashed password

### 7. Run the Application

```bash
npm run dev
```

Visit:
- **Frontend**: http://localhost:3000
- **Admin Login**: http://localhost:3000/admin/login

## Usage

### For End Users

1. **Sign Up**: Visit the homepage and click "Get Started"
2. **Choose Plan**: Select weekly, monthly, or yearly subscription
3. **Payment**: Complete payment via Stripe Checkout
4. **Chat**: Access the AI assistant from your dashboard
5. **Ask Questions**: Get legal advice based on uploaded documents

### For Administrators

1. **Login**: Visit `/admin/login` with your admin credentials
2. **Upload Documents**: Use `/admin/upload` to add legal documents
3. **Monitor**: View user stats and document status in admin dashboard
4. **Manage**: Track document versions and processing status

## API Endpoints

### Public
- `POST /api/auth/callback` - OAuth callback
- `POST /api/stripe/webhook` - Stripe webhooks

### Authenticated Users
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Billing portal
- `POST /api/chat` - AI chat endpoint

### Admin Only
- `POST /api/admin/login` - Admin authentication
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/documents` - List documents
- `GET /api/admin/stats` - User statistics
- `POST /api/admin/upload` - Upload documents
- `POST /api/admin/process` - Process documents

## File Structure

```
├── src/
│   ├── app/
│   │   ├── admin/           # Admin pages
│   │   ├── api/             # API routes
│   │   ├── auth/            # Auth callbacks
│   │   ├── chat/            # Chat interface
│   │   ├── dashboard/       # User dashboard
│   │   ├── login/           # User login
│   │   └── subscribe/       # Subscription plans
│   └── ...
├── lib/                     # Utility libraries
├── supabase-setup.sql      # Database schema
└── ...
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add all environment variables
3. Deploy

### Manual Deployment

1. Build the application: `npm run build`
2. Deploy to your hosting provider
3. Set up environment variables
4. Configure domain and SSL

## Security Considerations

- All user data is encrypted at rest
- Admin authentication uses JWT tokens
- File uploads are validated and scanned
- Rate limiting on API endpoints
- CORS configured for security
- No logging of sensitive information

## Support

For issues and feature requests, please check the documentation or contact support.

## License

This project is proprietary software. All rights reserved.

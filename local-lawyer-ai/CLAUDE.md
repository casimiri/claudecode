# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Next.js 15 SaaS application providing AI-powered legal assistance based on local law documents. The system allows users to subscribe to access an AI assistant trained on legal documents uploaded by administrators.

## Development Commands

### Core Development
- `npm run dev --turbopack` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm start` - Start production server

### Testing the Application
- Access frontend at http://localhost:3000
- Admin panel at http://localhost:3000/admin/login
- Use `/api/debug/auth` to test authentication state
- Use `/api/test/auth` for API authentication testing

## System Architecture

### Core Data Flow
1. **Document Processing Pipeline**: Admins upload legal documents → Text extraction → Vector embeddings → PGVector storage
2. **AI Chat System**: User query → Vector similarity search → RAG with OpenAI → Response with document context
3. **Subscription & Token Management**: Stripe billing → Token allocation → Usage tracking → Period-based resets
4. **Chat Persistence**: Conversations saved with full history and token usage tracking

### Key Architectural Components

#### Authentication System
- **User Auth**: Supabase Auth with OAuth (Google/Facebook) 
- **Admin Auth**: Separate JWT-based system with bcrypt password hashing
- **Authorization**: RLS policies on Supabase tables for data isolation

#### AI & Vector Search
- **Embeddings**: OpenAI text-embedding-ada-002 for document chunks
- **Vector DB**: Supabase PGVector extension for similarity search  
- **RAG Pipeline**: Search → Context retrieval → GPT-3.5-turbo with legal context
- **Smart Chunking**: Documents split into searchable chunks with metadata

#### Subscription & Billing
- **Stripe Integration**: Checkout sessions, webhooks, customer portal
- **Plan Types**: Free (10K tokens/month), Weekly, Monthly, Yearly
- **Token Management**: Persistent tracking with subscription-based reset periods
- **Usage Tracking**: Real-time consumption with overflow protection

#### Document Management
- **File Processing**: PDF, DOCX, TXT support with text extraction
- **Version Control**: Document versioning with `is_current` flags
- **Storage**: Supabase Storage with admin-only upload permissions
- **Async Processing**: Background embedding generation after upload

### Database Schema (Key Tables)

#### Users Table
```sql
users: id, email, subscription_plan, subscription_status, tokens_used_this_period, 
       tokens_limit, current_period_start, current_period_end, subscription_start_date
```

#### Document System
```sql
legal_documents: id, filename, version, is_current, processed, content_type
document_chunks: id, document_id, content, embedding (vector), chunk_index
```

#### Chat & Token Tracking
```sql
conversations: id, user_id, title, created_at
chat_exchanges: id, conversation_id, user_message, assistant_response, tokens_used
token_usage_logs: id, user_id, tokens_used, action_type, request_details
```

### Critical Business Logic

#### Token Management System
- **Persistent Tracking**: Token usage survives sessions via database storage
- **Subscription-Based Resets**: Reset dates calculated from actual subscription start dates
- **Smart Reset Logic**: PostgreSQL functions auto-reset when periods expire
- **Plan-Aware Limits**: Different token allocations per subscription tier
- **Sign-in Preservation**: Token usage is NOT reset when users sign in/out

#### Vector Search & RAG
- **Similarity Threshold**: 0.7 minimum for document relevance
- **Context Window**: Max 5 document chunks per query
- **Conversation Memory**: Last 6 messages maintained for context
- **Source Attribution**: Track which documents contributed to responses

#### Admin Document Workflow
1. Upload document to Supabase Storage
2. Extract text content (PDF/DOCX/TXT)
3. Generate embeddings via OpenAI
4. Split into chunks and store in PGVector
5. Mark document as processed and current version

## Important Implementation Details

### Environment Requirements
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase connection
- `SUPABASE_SERVICE_ROLE_KEY` - Admin database operations
- `OPENAI_API_KEY` - GPT-3.5 and embeddings
- `STRIPE_SECRET_KEY` & `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe payment processing
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `JWT_SECRET` - Admin JWT token signing
- `ADMIN_EMAIL` & `ADMIN_PASSWORD` - Initial admin account
- `NEXTAUTH_SECRET` & `NEXTAUTH_URL` - NextAuth configuration (if using OAuth)
- Optional OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`

### Database Functions (PostgreSQL)
- `search_document_chunks(query_embedding, match_threshold, match_count)` - Vector similarity search
- `get_user_token_stats_with_reset(user_uuid)` - Get stats with auto-reset logic
- `reset_user_tokens_if_needed(user_uuid)` - Smart period reset based on subscription dates
- `reset_all_expired_token_periods()` - Bulk reset for cron jobs

### API Security Patterns
- All user APIs require Supabase auth via cookies
- Admin APIs use separate JWT authentication
- RLS policies enforce user data isolation
- Token consumption checked before expensive operations
- Rate limiting via token allocation system

### Key Migration Files
- `supabase-setup.sql` - Initial database schema
- `token-persistence-fix.sql` - Persistent token tracking system  
- `chat-persistence-migration.sql` - Conversation history system

### Internationalization
- Uses `next-intl` for localization
- Routes are prefixed with locale (`/[locale]/...`)
- Language switcher component available

## Development Notes

### Testing User Flows
1. Create test user via OAuth login
2. Subscribe to plan via Stripe (use test mode)
3. Upload legal documents via admin panel
4. Test chat with document-based queries
5. Verify token consumption and persistence

### Common Debugging
- Check Supabase RLS policies if data access fails
- Verify PGVector extension enabled for vector search
- Monitor token usage via `/api/tokens/usage` endpoint
- Use admin dashboard to track document processing status
- Test Stripe webhooks with ngrok for local development

### Deployment Requirements
- Supabase project with PGVector extension enabled
- Stripe account with webhook endpoints configured
- OpenAI API access for embeddings and chat
- Storage bucket named `legal-documents` in Supabase
- Environment variables configured in hosting platform

### File Structure Overview
```
src/app/
├── [locale]/           # Internationalized user pages
│   ├── chat/          # Main chat interface
│   ├── dashboard/     # User dashboard and profile
│   ├── login/         # User authentication
│   └── subscribe/     # Subscription plans
├── admin/             # Admin-only pages (separate auth)
│   ├── dashboard/     # Admin stats and overview
│   ├── login/         # Admin authentication
│   └── upload/        # Document upload interface
└── api/               # API routes
    ├── admin/         # Admin API endpoints (JWT auth)
    ├── chat/          # Chat and conversation management
    ├── stripe/        # Payment processing
    └── tokens/        # Token usage tracking
```

### API Route Authentication Patterns
- **User routes** (`/api/chat`, `/api/stripe`, `/api/tokens`): Require Supabase auth cookies
- **Admin routes** (`/api/admin/*`): Require JWT token in Authorization header
- **Public routes** (`/api/stripe/webhook`): No auth but verify signatures
- **Debug routes** (`/api/debug/*`, `/api/test/*`): Development only

### Key Library Files
- `lib/supabase.ts` - Database client configuration with RLS
- `lib/openai.ts` - OpenAI client for chat and embeddings  
- `lib/stripe.ts` - Stripe integration for subscriptions
- `lib/auth.ts` - Admin JWT authentication utilities
- `lib/tokenUsage.ts` - Token consumption tracking
- `lib/chatPersistence.ts` - Conversation history management
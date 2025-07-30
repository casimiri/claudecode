# Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Configuration
- [ ] All environment variables configured in `.env.local`
- [ ] Supabase project created and configured
- [ ] OpenAI API key obtained
- [ ] Stripe account set up with products and prices
- [ ] OAuth apps configured (Google/Facebook)
- [ ] Admin password hashed and updated

### 2. Database Setup
- [ ] PGVector extension enabled in Supabase
- [ ] Database schema deployed (`supabase-setup.sql`)
- [ ] Storage bucket `legal-documents` created
- [ ] Row Level Security policies verified

### 3. Stripe Configuration
- [ ] Products created (Weekly $9.99, Monthly $29.99, Yearly $299.99)
- [ ] Price IDs added to environment variables
- [ ] Webhook endpoint configured
- [ ] Test payments working

### 4. OAuth Setup
- [ ] Google OAuth credentials created
- [ ] Facebook OAuth app configured
- [ ] Redirect URIs configured for production domain
- [ ] Test authentication flows

## Deployment Steps

### Vercel Deployment

1. **Connect Repository**
   - [ ] Connect GitHub repository to Vercel
   - [ ] Set framework preset to Next.js

2. **Environment Variables**
   - [ ] Add all production environment variables
   - [ ] Update `NEXTAUTH_URL` to production domain
   - [ ] Update OAuth redirect URIs

3. **Build Settings**
   - [ ] Build command: `npm run build`
   - [ ] Output directory: `.next`
   - [ ] Install command: `npm install`

4. **Domain Configuration**
   - [ ] Configure custom domain (optional)
   - [ ] SSL certificate verified
   - [ ] DNS configured

### Post-Deployment

1. **Stripe Webhook Update**
   - [ ] Update webhook URL to production domain
   - [ ] Verify webhook events are being received

2. **OAuth Redirect URIs**
   - [ ] Update Google OAuth redirect URIs
   - [ ] Update Facebook OAuth redirect URIs

3. **Testing**
   - [ ] Test user registration and authentication
   - [ ] Test subscription flow
   - [ ] Test admin login and document upload
   - [ ] Test AI chat functionality
   - [ ] Test billing portal

## Security Checklist

- [ ] All secrets properly configured
- [ ] Database RLS policies active
- [ ] File upload validation working
- [ ] Admin routes protected
- [ ] HTTPS enforced
- [ ] CORS configured properly

## Monitoring

- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure analytics (Vercel Analytics)
- [ ] Monitor database performance
- [ ] Set up alerts for failed payments

## Documentation

- [ ] Update README with production setup
- [ ] Document admin procedures
- [ ] Create user guides
- [ ] API documentation complete

## Performance Optimization

- [ ] Enable Vercel Analytics
- [ ] Configure caching headers
- [ ] Optimize images
- [ ] Monitor Core Web Vitals
- [ ] Set up database connection pooling

## Backup Strategy

- [ ] Database backups automated (Supabase handles this)
- [ ] Code repository backed up
- [ ] Environment variables documented
- [ ] Recovery procedures documented

## Legal & Compliance

- [ ] Privacy policy created
- [ ] Terms of service created
- [ ] GDPR compliance verified
- [ ] Data retention policies defined
- [ ] User consent mechanisms implemented

## Support Setup

- [ ] Support email configured
- [ ] Help documentation created
- [ ] Admin training completed
- [ ] Escalation procedures defined

## Launch

- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Team trained
- [ ] Launch plan executed
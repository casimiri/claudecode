# Facebook OAuth Setup Guide

This guide will help you enable Facebook OAuth for the Local Lawyer AI application.

## Current Status

❌ **Facebook OAuth is currently disabled** due to provider not being configured in Supabase.

✅ **Google OAuth is working** and available for users.

## Setup Steps

### 1. Enable Facebook Provider in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `nmyismgzzzpvcdmamzop`
3. Navigate to **Authentication** → **Providers**
4. Find **Facebook** in the provider list
5. Toggle it **ON** (enabled)

### 2. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click **My Apps** → **Create App**
3. Choose **Consumer** app type
4. Fill in app details:
   - **App Name**: Local Lawyer AI
   - **App Contact Email**: Your email
   - **App Purpose**: Authentication for legal AI application

### 3. Configure Facebook App

1. In your Facebook App dashboard, go to **Products** → **Facebook Login**
2. Click **Settings** under Facebook Login
3. Add this **Valid OAuth Redirect URI**:
   ```
   https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback
   ```
   
   **Important**: This is your Supabase callback URL, NOT your application URL. 
   Facebook redirects to Supabase first, then Supabase redirects to your application.
   
   **Do NOT add** your application URLs like:
   - ❌ `https://shiny-engine-467qjw54vwfjjj4-3000.app.github.dev/auth/callback`
   - ❌ `http://localhost:3000/auth/callback`

4. **Client OAuth Settings**:
   - ✅ Use Strict Mode for Redirect URIs: **Yes**
   - ✅ Enforce HTTPS: **Yes**
   - ✅ Embedded Browser OAuth Login: **No**

### 4. Get Facebook App Credentials

1. Go to **Settings** → **Basic** in your Facebook App
2. Copy your:
   - **App ID** (will be visible)
   - **App Secret** (click "Show" to reveal)

### 5. Configure Supabase with Facebook Credentials

1. Back in Supabase Dashboard: **Authentication** → **Providers** → **Facebook**
2. Enter your Facebook credentials:
   - **App ID**: Your Facebook App ID
   - **App Secret**: Your Facebook App Secret

3. **Additional Settings**:
   - **Redirect URL**: Leave as default (`https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback`)
   - **Scopes**: `email` (default is fine)

### 6. Enable Facebook OAuth in Application

Once Facebook is configured in Supabase, enable it in the application:

1. Open `lib/auth-config.ts`
2. Change the Facebook provider configuration:
   ```typescript
   facebook: {
     enabled: true, // Change from false to true
     name: 'Facebook',
     icon: 'Facebook'
   }
   ```

### 7. Test Facebook OAuth

1. Build and restart your application:
   ```bash
   npm run build
   npm run dev
   ```

2. Navigate to `/en/login`
3. You should now see both Google and Facebook login buttons
4. Test Facebook login with a test account

## Troubleshooting

### Common Errors

#### "Unsupported provider: provider is not enabled"
- **Cause**: Facebook provider not enabled in Supabase
- **Solution**: Complete steps 1 and 5 above

#### "OAuth redirect URI mismatch"
- **Cause**: Redirect URI not configured correctly in Facebook app
- **Solution**: Ensure the redirect URI in Facebook app settings exactly matches:
  `https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback`

#### "Invalid client_id"
- **Cause**: Facebook App ID is incorrect in Supabase settings
- **Solution**: Double-check the App ID from Facebook Developer Console

#### "Invalid client_secret"
- **Cause**: Facebook App Secret is incorrect in Supabase settings
- **Solution**: Regenerate App Secret in Facebook and update Supabase

### Testing Checklist

- [ ] Facebook provider enabled in Supabase dashboard
- [ ] Facebook app created with correct redirect URI
- [ ] Facebook credentials added to Supabase
- [ ] Application code updated to enable Facebook provider
- [ ] Facebook login button appears on login page
- [ ] Facebook OAuth flow completes successfully
- [ ] User is redirected back to application after login
- [ ] User session is created in Supabase

## Security Notes

- **App Secret**: Never expose your Facebook App Secret in client-side code
- **HTTPS**: Always use HTTPS in production for OAuth callbacks
- **Scopes**: Only request necessary permissions (email is usually sufficient)
- **Testing**: Use Facebook's test users for development testing

## Current Configuration

Your Supabase project: `nmyismgzzzpvcdmamzop`
OAuth callback URL: `https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback`

Once configured, the Facebook login will be available alongside Google OAuth for a seamless user authentication experience.
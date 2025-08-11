/**
 * OAuth Debug Utilities
 * Helper functions to debug OAuth configuration issues
 */

export const getOAuthDebugInfo = () => {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'N/A (Server-side)';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  return {
    currentOrigin,
    supabaseUrl,
    expectedCallbackUrl: `${supabaseUrl}/auth/v1/callback`,
    expectedReturnUrl: `${currentOrigin}/auth/callback`,
    
    // Configuration checks
    checks: {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      isCodespaces: currentOrigin.includes('app.github.dev'),
      isLocalhost: currentOrigin.includes('localhost'),
      isHTTPS: currentOrigin.startsWith('https://'),
    },
    
    // Common issues
    potentialIssues: [
      ...(currentOrigin.includes('app.github.dev') 
        ? ['Using GitHub Codespaces - ensure Supabase Site URL is updated to match this URL']
        : []
      ),
      ...(!currentOrigin.startsWith('https://') && !currentOrigin.includes('localhost')
        ? ['Not using HTTPS - Facebook OAuth requires HTTPS in production']
        : []
      )
    ]
  };
};

export const logOAuthDebugInfo = () => {
  if (typeof window === 'undefined') return;
  
  const debugInfo = getOAuthDebugInfo();
  
  console.group('🔍 OAuth Debug Information');
  console.log('Current Origin:', debugInfo.currentOrigin);
  console.log('Supabase URL:', debugInfo.supabaseUrl);
  console.log('Expected Facebook Redirect:', debugInfo.expectedCallbackUrl);
  console.log('Expected Return URL:', debugInfo.expectedReturnUrl);
  console.log('Configuration Checks:', debugInfo.checks);
  
  if (debugInfo.potentialIssues.length > 0) {
    console.warn('⚠️ Potential Issues:');
    debugInfo.potentialIssues.forEach((issue, index) => {
      console.warn(`${index + 1}. ${issue}`);
    });
  }
  
  console.groupEnd();
};

/**
 * Test OAuth redirect URLs for debugging
 */
export const testOAuthRedirects = () => {
  const debugInfo = getOAuthDebugInfo();
  
  return {
    facebookShouldRedirectTo: debugInfo.expectedCallbackUrl,
    supabaseShouldRedirectTo: debugInfo.expectedReturnUrl,
    
    // Instructions for Facebook app configuration
    facebookAppConfiguration: {
      siteUrl: debugInfo.currentOrigin,
      validOAuthRedirectURIs: [debugInfo.expectedCallbackUrl],
    },
    
    // Instructions for Supabase configuration  
    supabaseConfiguration: {
      siteUrl: debugInfo.currentOrigin,
      authCallbacks: [`${debugInfo.currentOrigin}/auth/callback`]
    }
  };
};

/**
 * Generate configuration values for copy-paste
 */
export const generateConfigValues = () => {
  const debugInfo = getOAuthDebugInfo();
  
  return {
    // For Facebook App Settings
    facebook: {
      siteUrl: debugInfo.currentOrigin,
      validOAuthRedirectURIs: debugInfo.expectedCallbackUrl,
    },
    
    // For Supabase Settings  
    supabase: {
      siteUrl: debugInfo.currentOrigin,
      jwtSecret: 'Use existing JWT_SECRET from your .env.local',
    },
    
    // Copy-paste values
    copyPasteValues: {
      facebookSiteUrl: debugInfo.currentOrigin,
      facebookRedirectURI: debugInfo.expectedCallbackUrl,
      supabaseSiteUrl: debugInfo.currentOrigin,
    }
  };
};
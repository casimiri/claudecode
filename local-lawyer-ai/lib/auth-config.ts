/**
 * Authentication configuration and provider availability checks
 */

export const authConfig = {
  providers: {
    google: {
      enabled: true,
      name: 'Google',
      icon: 'Chrome'
    },
    facebook: {
      enabled: true, // Re-enabled after fixing database issues
      name: 'Facebook',
      icon: 'Facebook'
    }
  }
} as const;

/**
 * Check if a specific OAuth provider is available
 */
export const isProviderEnabled = (provider: keyof typeof authConfig.providers): boolean => {
  return authConfig.providers[provider]?.enabled ?? false;
};

/**
 * Get list of available OAuth providers
 */
export const getAvailableProviders = () => {
  return Object.entries(authConfig.providers)
    .filter(([, config]) => config.enabled)
    .map(([provider, config]) => ({
      provider: provider as keyof typeof authConfig.providers,
      ...config
    }));
};

/**
 * Facebook OAuth configuration steps for administrators
 */
export const facebookSetupInstructions = {
  steps: [
    {
      title: "Enable Facebook Provider in Supabase",
      description: "Go to Authentication → Providers in your Supabase dashboard and enable Facebook",
      url: "https://app.supabase.com"
    },
    {
      title: "Create Facebook App",
      description: "Create a new app at Facebook Developers Console",
      url: "https://developers.facebook.com"
    },
    {
      title: "Configure OAuth Redirect URI",
      description: "Add this redirect URI in your Facebook app settings:",
      value: "https://nmyismgzzzpvcdmamzop.supabase.co/auth/v1/callback"
    },
    {
      title: "Add Facebook Credentials",
      description: "Enter your Facebook App ID and App Secret in Supabase provider settings"
    }
  ],
  troubleshooting: {
    "validation_failed": "Provider is not enabled in Supabase dashboard",
    "invalid_credentials": "Facebook App ID or Secret is incorrect",
    "redirect_uri_mismatch": "OAuth redirect URI not configured in Facebook app"
  }
} as const;
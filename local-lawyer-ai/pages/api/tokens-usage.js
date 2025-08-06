import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create authenticated Supabase client
  const supabase = createPagesServerClient({ req, res });

  try {
    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user token summary using our new function
    const { data: tokenSummary, error: summaryError } = await supabase
      .rpc('get_user_token_summary', {
        p_user_id: session.user.id
      });

    if (summaryError) {
      console.error('Error fetching token summary:', summaryError);
      
      // Fallback to direct user query
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          tokens_used_this_period,
          tokens_limit,
          total_tokens_purchased
        `)
        .eq('id', session.user.id)
        .single();

      if (userError) {
        console.error('Error fetching user token data:', userError);
        
        // Return default values for new users
        return res.status(200).json({
          tokens_remaining: 0,
          tokens_used: 0,
          tokens_limit: 0,
          total_purchased: 0,
          purchase_count: 0,
          last_purchase_date: null,
          usage_percentage: 0
        });
      }

      // Calculate values manually
      const tokensRemaining = (userData.tokens_limit || 0) - (userData.tokens_used_this_period || 0);
      const usagePercentage = userData.tokens_limit > 0 
        ? Math.round((userData.tokens_used_this_period / userData.tokens_limit) * 100 * 100) / 100
        : 0;

      return res.status(200).json({
        tokens_remaining: Math.max(0, tokensRemaining),
        tokens_used: userData.tokens_used_this_period || 0,
        tokens_limit: userData.tokens_limit || 0,
        total_purchased: userData.total_tokens_purchased || 0,
        purchase_count: 0,
        last_purchase_date: null,
        usage_percentage: usagePercentage
      });
    }

    // Return the summary data (array with single result)
    const summary = Array.isArray(tokenSummary) ? tokenSummary[0] : tokenSummary;
    
    return res.status(200).json({
      tokens_remaining: summary?.tokens_remaining || 0,
      tokens_used: summary?.tokens_used || 0,
      tokens_limit: summary?.tokens_limit || 0,
      total_purchased: summary?.total_purchased || 0,
      purchase_count: summary?.purchase_count || 0,
      last_purchase_date: summary?.last_purchase_date || null,
      usage_percentage: summary?.usage_percentage || 0
    });

  } catch (error) {
    console.error('Token usage API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
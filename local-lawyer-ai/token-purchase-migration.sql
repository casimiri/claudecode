-- Token Purchase System Migration
-- Migrates from subscription-based to token-based system

-- 1. Update users table to support token purchases
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS total_tokens_purchased INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_purchase_history JSONB DEFAULT '[]'::jsonb;

-- Update the check constraint to include token-based plans
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_subscription_plan_check;

ALTER TABLE public.users 
  ADD CONSTRAINT users_subscription_plan_check 
  CHECK (subscription_plan IN ('free', 'weekly', 'monthly', 'yearly', 'tokens'));

-- 2. Create token_purchases table for tracking purchases
CREATE TABLE IF NOT EXISTS public.token_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  tokens_purchased INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  package_name TEXT NOT NULL,
  purchase_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT valid_purchase_status CHECK (purchase_status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_purchases_user_id ON public.token_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_session_id ON public.token_purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_status ON public.token_purchases(purchase_status);
CREATE INDEX IF NOT EXISTS idx_token_purchases_created_at ON public.token_purchases(created_at DESC);

-- 4. Update token_usage_logs to support purchase tracking
ALTER TABLE public.token_usage_logs
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES public.token_purchases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'usage';

-- Add constraint for transaction types
ALTER TABLE public.token_usage_logs 
  ADD CONSTRAINT valid_transaction_type 
  CHECK (transaction_type IN ('usage', 'purchase', 'refund', 'bonus'));

-- 5. Function to process token purchase
CREATE OR REPLACE FUNCTION process_token_purchase(
  p_user_id UUID,
  p_stripe_session_id TEXT,
  p_tokens_purchased INTEGER,
  p_amount_paid DECIMAL(10,2),
  p_package_name TEXT,
  p_purchase_details JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN AS $$
DECLARE
  purchase_id UUID;
  current_limit INTEGER;
BEGIN
  -- Create purchase record
  INSERT INTO public.token_purchases (
    user_id, 
    stripe_session_id, 
    tokens_purchased, 
    amount_paid, 
    package_name, 
    purchase_status,
    completed_at
  ) VALUES (
    p_user_id, 
    p_stripe_session_id, 
    p_tokens_purchased, 
    p_amount_paid, 
    p_package_name, 
    'completed',
    NOW()
  ) RETURNING id INTO purchase_id;

  -- Get current token limit
  SELECT tokens_limit INTO current_limit 
  FROM public.users 
  WHERE id = p_user_id;

  -- Update user token balance
  UPDATE public.users 
  SET 
    tokens_limit = COALESCE(tokens_limit, 0) + p_tokens_purchased,
    total_tokens_purchased = COALESCE(total_tokens_purchased, 0) + p_tokens_purchased,
    tokens_purchase_history = COALESCE(tokens_purchase_history, '[]'::jsonb) || 
      jsonb_build_object(
        'purchase_id', purchase_id,
        'tokens', p_tokens_purchased,
        'amount', p_amount_paid,
        'package', p_package_name,
        'date', NOW(),
        'details', p_purchase_details
      ),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the token addition
  INSERT INTO public.token_usage_logs (
    user_id, 
    tokens_used, 
    action_type, 
    transaction_type,
    purchase_id,
    request_details
  ) VALUES (
    p_user_id, 
    -p_tokens_purchased, -- Negative indicates tokens added
    'purchase', 
    'purchase',
    purchase_id,
    jsonb_build_object(
      'package_name', p_package_name,
      'amount_paid', p_amount_paid,
      'stripe_session_id', p_stripe_session_id,
      'purchase_details', p_purchase_details
    )
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false
    RAISE WARNING 'Error processing token purchase: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get user token summary with purchase history
CREATE OR REPLACE FUNCTION get_user_token_summary(p_user_id UUID)
RETURNS TABLE (
  tokens_remaining INTEGER,
  tokens_used INTEGER,
  tokens_limit INTEGER,
  total_purchased INTEGER,
  purchase_count INTEGER,
  last_purchase_date TIMESTAMPTZ,
  usage_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (u.tokens_limit - u.tokens_used_this_period) as tokens_remaining,
    u.tokens_used_this_period as tokens_used,
    u.tokens_limit,
    COALESCE(u.total_tokens_purchased, 0) as total_purchased,
    COALESCE((
      SELECT COUNT(*)::INTEGER 
      FROM public.token_purchases 
      WHERE user_id = p_user_id AND purchase_status = 'completed'
    ), 0) as purchase_count,
    (
      SELECT MAX(completed_at) 
      FROM public.token_purchases 
      WHERE user_id = p_user_id AND purchase_status = 'completed'
    ) as last_purchase_date,
    CASE 
      WHEN u.tokens_limit > 0 THEN 
        ROUND((u.tokens_used_this_period::NUMERIC / u.tokens_limit::NUMERIC * 100), 2)
      ELSE 0 
    END as usage_percentage
  FROM public.users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 7. RLS Policies for new tables
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

-- Users can only see their own purchases
CREATE POLICY "Users can view own token purchases" ON public.token_purchases 
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all purchases (for webhooks)
CREATE POLICY "Service role can manage token purchases" ON public.token_purchases 
  FOR ALL USING (true);

-- 8. Grants for functions
GRANT EXECUTE ON FUNCTION process_token_purchase(UUID, TEXT, INTEGER, DECIMAL, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_token_summary(UUID) TO authenticated, service_role;

-- 9. Create a view for easy token balance checking
CREATE OR REPLACE VIEW user_token_balances AS
SELECT 
  u.id as user_id,
  u.email,
  u.tokens_limit,
  u.tokens_used_this_period,
  (u.tokens_limit - u.tokens_used_this_period) as tokens_remaining,
  u.total_tokens_purchased,
  CASE 
    WHEN u.tokens_limit > 0 THEN 
      ROUND((u.tokens_used_this_period::NUMERIC / u.tokens_limit::NUMERIC * 100), 2)
    ELSE 0 
  END as usage_percentage,
  u.created_at,
  u.updated_at
FROM public.users u;

-- Grant access to the view
GRANT SELECT ON user_token_balances TO authenticated, service_role;

-- 10. Insert default token package configurations
CREATE TABLE IF NOT EXISTS public.token_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT,
  savings_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default packages
INSERT INTO public.token_packages (package_id, name, tokens, price_cents, savings_percentage) VALUES
  ('starter', 'Starter Pack', 10000, 900, 0),
  ('popular', 'Popular Pack', 50000, 3900, 13),
  ('power', 'Power Pack', 150000, 9900, 27),
  ('enterprise', 'Enterprise Pack', 500000, 29900, 33)
ON CONFLICT (package_id) DO UPDATE SET
  name = EXCLUDED.name,
  tokens = EXCLUDED.tokens,
  price_cents = EXCLUDED.price_cents,
  savings_percentage = EXCLUDED.savings_percentage,
  updated_at = NOW();

COMMENT ON TABLE public.token_purchases IS 'Tracks individual token purchases made by users';
COMMENT ON TABLE public.token_packages IS 'Available token packages for purchase';
COMMENT ON FUNCTION process_token_purchase IS 'Processes a completed token purchase from Stripe webhook';
COMMENT ON FUNCTION get_user_token_summary IS 'Returns comprehensive token usage and purchase summary for a user';
COMMENT ON VIEW user_token_balances IS 'Easy access view for user token balances and usage statistics';
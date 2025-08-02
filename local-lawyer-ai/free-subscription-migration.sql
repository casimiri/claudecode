-- Migration: Add Free Subscription Support with Token Usage Tracking
-- This migration extends the existing schema to support free subscriptions with AI token limitations

-- 1. Update the users table to support free plan
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_subscription_plan_check;

ALTER TABLE public.users 
  ADD CONSTRAINT users_subscription_plan_check 
  CHECK (subscription_plan IN ('free', 'weekly', 'monthly', 'yearly'));

-- Add new columns for token usage tracking
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS tokens_used_this_period INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_limit INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period_start_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS period_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month');

-- 2. Create token_usage_logs table for detailed tracking
CREATE TABLE IF NOT EXISTS public.token_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  tokens_used INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- 'chat', 'search', 'question'
  request_details JSONB, -- Store request metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create subscription_limits table for plan configurations
CREATE TABLE IF NOT EXISTS public.subscription_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type TEXT UNIQUE NOT NULL,
  tokens_per_period INTEGER NOT NULL,
  period_duration_days INTEGER NOT NULL,
  max_questions_per_month INTEGER,
  features JSONB, -- Store plan features as JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default subscription limits
INSERT INTO public.subscription_limits (plan_type, tokens_per_period, period_duration_days, max_questions_per_month, features) VALUES
  ('free', 10000, 30, 5, '{"chat": true, "basic_search": true, "community_support": true}'),
  ('weekly', 100000, 7, 50, '{"chat": true, "advanced_search": true, "email_support": true, "unlimited_questions": true}'),
  ('monthly', 500000, 30, 200, '{"chat": true, "advanced_search": true, "priority_support": true, "unlimited_questions": true}'),
  ('yearly', 6000000, 365, 2400, '{"chat": true, "advanced_search": true, "priority_support": true, "unlimited_questions": true, "early_access": true}')
ON CONFLICT (plan_type) DO UPDATE SET
  tokens_per_period = EXCLUDED.tokens_per_period,
  period_duration_days = EXCLUDED.period_duration_days,
  max_questions_per_month = EXCLUDED.max_questions_per_month,
  features = EXCLUDED.features,
  updated_at = NOW();

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_user_id ON public.token_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at ON public.token_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_users_tokens_period ON public.users(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_subscription_limits_plan_type ON public.subscription_limits(plan_type);

-- 5. Function to reset user token usage for new period
CREATE OR REPLACE FUNCTION reset_user_token_period(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  user_plan TEXT;
  plan_limits RECORD;
BEGIN
  -- Get user's current plan
  SELECT subscription_plan INTO user_plan 
  FROM public.users 
  WHERE id = user_uuid;
  
  -- Get plan limits
  SELECT * INTO plan_limits 
  FROM public.subscription_limits 
  WHERE plan_type = COALESCE(user_plan, 'free');
  
  -- Reset user's token usage and period
  UPDATE public.users 
  SET 
    tokens_used_this_period = 0,
    tokens_limit = plan_limits.tokens_per_period,
    period_start_date = NOW(),
    period_end_date = NOW() + (plan_limits.period_duration_days || ' days')::INTERVAL
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to consume tokens and check limits
CREATE OR REPLACE FUNCTION consume_user_tokens(
  user_uuid UUID, 
  tokens_to_consume INTEGER, 
  action_type TEXT DEFAULT 'chat',
  request_details JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  current_tokens INTEGER;
  token_limit INTEGER;
  period_end TIMESTAMPTZ;
  user_plan TEXT;
BEGIN
  -- Get current user token usage and limits
  SELECT 
    tokens_used_this_period, 
    tokens_limit, 
    period_end_date,
    subscription_plan 
  INTO current_tokens, token_limit, period_end, user_plan
  FROM public.users 
  WHERE id = user_uuid;
  
  -- Check if period has expired and reset if needed
  IF period_end < NOW() THEN
    PERFORM reset_user_token_period(user_uuid);
    -- Refresh values after reset
    SELECT tokens_used_this_period, tokens_limit 
    INTO current_tokens, token_limit
    FROM public.users 
    WHERE id = user_uuid;
  END IF;
  
  -- Check if user has enough tokens
  IF current_tokens + tokens_to_consume > token_limit THEN
    RETURN FALSE; -- Not enough tokens
  END IF;
  
  -- Consume tokens
  UPDATE public.users 
  SET tokens_used_this_period = tokens_used_this_period + tokens_to_consume
  WHERE id = user_uuid;
  
  -- Log the usage
  INSERT INTO public.token_usage_logs (user_id, tokens_used, action_type, request_details)
  VALUES (user_uuid, tokens_to_consume, action_type, request_details);
  
  RETURN TRUE; -- Tokens consumed successfully
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to check if user can perform action (without consuming tokens)
CREATE OR REPLACE FUNCTION can_user_consume_tokens(
  user_uuid UUID, 
  tokens_needed INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_tokens INTEGER;
  token_limit INTEGER;
  period_end TIMESTAMPTZ;
BEGIN
  SELECT 
    tokens_used_this_period, 
    tokens_limit, 
    period_end_date
  INTO current_tokens, token_limit, period_end
  FROM public.users 
  WHERE id = user_uuid;
  
  -- If period expired, they can use tokens (will be reset when consumed)
  IF period_end < NOW() THEN
    RETURN TRUE;
  END IF;
  
  -- Check if they have enough remaining tokens
  RETURN (current_tokens + tokens_needed <= token_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get user's token usage stats
CREATE OR REPLACE FUNCTION get_user_token_stats(user_uuid UUID)
RETURNS TABLE (
  tokens_used INTEGER,
  tokens_limit INTEGER,
  tokens_remaining INTEGER,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  plan_type TEXT,
  usage_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.tokens_used_this_period,
    u.tokens_limit,
    (u.tokens_limit - u.tokens_used_this_period) as tokens_remaining,
    u.period_start_date,
    u.period_end_date,
    COALESCE(u.subscription_plan, 'free') as plan_type,
    ROUND((u.tokens_used_this_period::NUMERIC / NULLIF(u.tokens_limit, 0)) * 100, 2) as usage_percentage
  FROM public.users u
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update the handle_new_user function to set up free plan by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_limits RECORD;
BEGIN
  -- Get free plan limits
  SELECT * INTO free_plan_limits 
  FROM public.subscription_limits 
  WHERE plan_type = 'free';

  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    avatar_url, 
    provider, 
    provider_id,
    subscription_status,
    subscription_plan,
    tokens_used_this_period,
    tokens_limit,
    period_start_date,
    period_end_date
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.app_metadata->>'provider', 'email'),
    COALESCE(NEW.raw_user_meta_data->>'provider_id', NEW.id::text),
    'active',
    'free',
    0,
    free_plan_limits.tokens_per_period,
    NOW(),
    NOW() + (free_plan_limits.period_duration_days || ' days')::INTERVAL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Add RLS policies for new tables
ALTER TABLE public.token_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own token usage logs
CREATE POLICY "Users can view own token usage" ON public.token_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Subscription limits are viewable by all authenticated users
CREATE POLICY "Authenticated users can view subscription limits" ON public.subscription_limits
  FOR SELECT TO authenticated USING (true);

-- Only admins can modify subscription limits
CREATE POLICY "Only admins can modify subscription limits" ON public.subscription_limits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE email = auth.email()
    )
  );

-- 11. Update trigger for subscription_limits
CREATE TRIGGER update_subscription_limits_updated_at 
  BEFORE UPDATE ON public.subscription_limits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Update existing users to have free plan if they don't have any plan
UPDATE public.users 
SET 
  subscription_plan = 'free',
  subscription_status = 'active',
  tokens_used_this_period = 0,
  tokens_limit = 10000,
  period_start_date = NOW(),
  period_end_date = NOW() + INTERVAL '30 days'
WHERE subscription_plan IS NULL OR subscription_status = 'inactive';
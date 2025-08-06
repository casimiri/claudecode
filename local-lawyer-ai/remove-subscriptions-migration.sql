-- Remove Subscription System Migration
-- Completely removes subscription-based system, keeps only token-based system

-- 1. First, drop policies that depend on subscription columns
DROP POLICY IF EXISTS "Users with active subscription can view documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Users with active subscription can view chunks" ON public.document_chunks;

-- 2. Create new token-based policies
-- Legal documents are viewable by any authenticated user with tokens
DROP POLICY IF EXISTS "Users with tokens can view documents" ON public.legal_documents;
CREATE POLICY "Users with tokens can view documents" ON public.legal_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND (total_tokens_purchased > 0 OR tokens_limit > 0)
    )
  );

-- Document chunks follow same rules as legal documents  
DROP POLICY IF EXISTS "Users with tokens can view chunks" ON public.document_chunks;
CREATE POLICY "Users with tokens can view chunks" ON public.document_chunks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND (total_tokens_purchased > 0 OR tokens_limit > 0)
    )
  );

-- 3. Drop subscription-related constraints and columns from users table
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_subscription_plan_check;

-- First, drop any triggers that might reference subscription columns
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Remove subscription columns
ALTER TABLE public.users 
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_plan,
  DROP COLUMN IF EXISTS subscription_id,
  DROP COLUMN IF EXISTS customer_id,
  DROP COLUMN IF EXISTS current_period_end,
  DROP COLUMN IF EXISTS period_start_date,
  DROP COLUMN IF EXISTS period_end_date;

-- 4. Ensure we have the token-related columns (if not already present)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS total_tokens_purchased INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_purchase_history JSONB DEFAULT '[]'::jsonb;

-- Recreate the updated_at trigger without subscription field references
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Update the trigger function to give new users default tokens
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    avatar_url, 
    provider, 
    provider_id, 
    tokens_used_this_period, 
    total_tokens_purchased
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.app_metadata->>'provider', 'email'),
    COALESCE(NEW.raw_user_meta_data->>'provider_id', NEW.id::text),
    0, -- tokens_used_this_period
    10000 -- total_tokens_purchased (default starter amount)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update the token usage function to use total_tokens_purchased as the limit
DROP FUNCTION IF EXISTS get_user_token_stats_with_reset(UUID);
CREATE OR REPLACE FUNCTION get_user_token_stats_with_reset(user_uuid UUID)
RETURNS TABLE (
  tokens_used INTEGER,
  tokens_limit INTEGER,
  tokens_remaining INTEGER,
  usage_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.tokens_used_this_period::INTEGER as tokens_used,
    u.total_tokens_purchased::INTEGER as tokens_limit,
    GREATEST(0, (u.total_tokens_purchased - u.tokens_used_this_period))::INTEGER as tokens_remaining,
    CASE 
      WHEN u.total_tokens_purchased > 0 THEN 
        ROUND((u.tokens_used_this_period::NUMERIC / u.total_tokens_purchased::NUMERIC * 100), 2)
      ELSE 0 
    END as usage_percentage
  FROM public.users u
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- 7. Create a simplified token reset function (for manual resets if needed)
DROP FUNCTION IF EXISTS reset_user_tokens_if_needed(UUID);
CREATE OR REPLACE FUNCTION reset_user_tokens_if_needed(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get user data
  SELECT * INTO user_record FROM public.users WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- For token-only system, we don't automatically reset tokens
  -- Tokens are permanent unless manually reset
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Update any existing users to have minimum tokens if they have none
UPDATE public.users 
SET total_tokens_purchased = GREATEST(total_tokens_purchased, 10000)
WHERE total_tokens_purchased < 1000;

-- 9. Comments
COMMENT ON FUNCTION get_user_token_stats_with_reset IS 'Returns token usage stats using total_tokens_purchased as limit';
COMMENT ON FUNCTION reset_user_tokens_if_needed IS 'Placeholder function for compatibility - tokens do not auto-reset in token-only system';

-- 10. Recreate the auth trigger for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 11. Clean up any orphaned data (be careful with this in production)
-- Note: Uncomment these if you want to clean up old subscription data
-- DELETE FROM public.token_purchases WHERE purchase_status = 'pending' AND created_at < NOW() - INTERVAL '7 days';
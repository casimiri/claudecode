-- NUCLEAR OPTION: Remove ALL triggers and functions that could reference subscription fields
-- This is a more aggressive approach when the targeted fixes don't work

-- 1. Drop ALL triggers on the users table
DROP TRIGGER IF EXISTS auto_reset_user_tokens ON public.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS subscription_reset_trigger ON public.users;
DROP TRIGGER IF EXISTS user_subscription_update ON public.users;
DROP TRIGGER IF EXISTS check_subscription_trigger ON public.users;

-- 2. Drop ALL functions that might reference subscription fields (with CASCADE to be sure)
DROP FUNCTION IF EXISTS reset_user_tokens_for_period() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS check_and_reset_expired_periods() CASCADE;
DROP FUNCTION IF EXISTS reset_user_tokens_if_needed(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_token_stats_with_reset(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_subscription_status() CASCADE;
DROP FUNCTION IF EXISTS check_subscription_expiry() CASCADE;

-- 3. Create completely new, clean functions without any subscription references

-- New handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
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
    total_tokens_purchased,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.app_metadata->>'provider', 'email'),
    COALESCE(NEW.raw_user_meta_data->>'provider_id', NEW.id::text),
    0, -- tokens_used_this_period
    10000, -- total_tokens_purchased (default starter amount)
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New simple update timestamp function just for users
CREATE OR REPLACE FUNCTION public.update_users_timestamp_only()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- New token stats function 
CREATE OR REPLACE FUNCTION get_user_token_stats_simple(user_uuid UUID)
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

-- Stub function for compatibility
CREATE OR REPLACE FUNCTION reset_user_tokens_if_needed(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Token-only system: no automatic resets
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. Create new clean triggers using the new functions
CREATE TRIGGER on_auth_user_created_v2
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_v2();

CREATE TRIGGER update_users_timestamp_only
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_users_timestamp_only();

-- 5. Test that we can update users table now
-- (This will fail if there are still subscription field references)
DO $$
BEGIN
  -- Try a simple update to test
  UPDATE public.users 
  SET updated_at = NOW() 
  WHERE id = 'af377857-6150-44e9-8f11-6bfbe8d25261';
  
  RAISE NOTICE 'SUCCESS: Users table update works!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'FAILED: Users table update still has issues: %', SQLERRM;
END $$;

-- Success message
SELECT 'Nuclear fix applied - all old triggers removed and new ones created!' as result;
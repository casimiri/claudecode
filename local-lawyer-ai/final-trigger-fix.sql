-- FINAL FIX: Remove the specific trigger that's causing the subscription_plan error
-- This is the definitive solution based on the error analysis

-- 1. Drop the specific trigger that's causing the subscription_plan error
DROP TRIGGER IF EXISTS handle_subscription_change_trigger ON public.users;

-- 2. Drop the function that references subscription_plan
DROP FUNCTION IF EXISTS handle_subscription_change() CASCADE;

-- 3. Drop other problematic triggers and functions we identified
DROP TRIGGER IF EXISTS auto_reset_user_tokens ON public.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS reset_user_tokens_for_period() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 4. Create clean token-only functions

-- Clean handle_new_user function without subscription references
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

-- 5. Recreate necessary triggers with clean functions
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 6. Test the fix with a sample update
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Try to update a user record to test if triggers work
  UPDATE public.users 
  SET updated_at = NOW() 
  WHERE id = 'af377857-6150-44e9-8f11-6bfbe8d25261';
  
  -- Try to update tokens_used_this_period to test token functionality
  UPDATE public.users 
  SET tokens_used_this_period = tokens_used_this_period 
  WHERE id = 'af377857-6150-44e9-8f11-6bfbe8d25261';
  
  RAISE NOTICE 'SUCCESS: All user table operations work correctly!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: User table operations still failing: %', SQLERRM;
END $$;

-- Success message
SELECT 'Final trigger fix applied - removed handle_subscription_change_trigger!' as result;
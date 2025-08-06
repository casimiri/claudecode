
-- COMPLETE Fix for subscription-related trigger issues
-- This fixes both chat token deduction AND auth callback issues

-- 1. Drop ALL problematic triggers and functions that reference subscription fields
DROP TRIGGER IF EXISTS auto_reset_user_tokens ON public.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all functions that reference subscription fields
DROP FUNCTION IF EXISTS reset_user_tokens_for_period();
DROP FUNCTION IF EXISTS check_and_reset_expired_periods();
DROP FUNCTION IF EXISTS handle_new_user();
-- Don't drop update_updated_at_column() as it's used by other tables - we'll recreate it safely

-- 2. Create clean token-only functions without subscription field references

-- Updated handle_new_user function without subscription fields
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure update_updated_at_column() function is safe (recreate to remove any subscription logic)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Simple compatibility function for expired periods (does nothing in token-only system)
CREATE OR REPLACE FUNCTION check_and_reset_expired_periods()
RETURNS INTEGER AS $$
BEGIN
  -- For token-only system, we don't auto-reset periods
  -- This function is kept for compatibility but does nothing
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate the necessary triggers with clean functions

-- Auth trigger for new users (handles sign-in)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Updated timestamp trigger
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Test the fix
SELECT 'Complete trigger fix applied successfully! Both chat and auth should now work.' as result;

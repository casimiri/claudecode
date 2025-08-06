-- MINIMAL Fix for subscription-related trigger issues  
-- This avoids the CASCADE issue by being more targeted

-- 1. Drop only the problematic triggers (not the functions they use if shared)
DROP TRIGGER IF EXISTS auto_reset_user_tokens ON public.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop only the functions that definitely reference subscription fields  
DROP FUNCTION IF EXISTS reset_user_tokens_for_period() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 3. Create clean token-only handle_new_user function
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

-- 4. Recreate only the auth trigger (leave update_users_updated_at as is since it might not be the issue)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Test if the update trigger is actually the problem by trying to recreate it
-- If this fails, then we know update_updated_at_column() needs to be fixed too
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Success message
SELECT 'Minimal trigger fix applied successfully!' as result;
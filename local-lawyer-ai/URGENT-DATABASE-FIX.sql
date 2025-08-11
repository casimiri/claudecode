-- URGENT: Fix the app_metadata error immediately
-- Run this in your Supabase SQL editor right now

-- 1. Drop the broken trigger immediately
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create a minimal working trigger without app_metadata reference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    avatar_url,
    tokens_used_this_period,
    tokens_limit,
    total_tokens_purchased,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'picture',
    0,
    10000,
    10000,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Test message
SELECT 'URGENT FIX APPLIED - Facebook OAuth should work now!' as status;
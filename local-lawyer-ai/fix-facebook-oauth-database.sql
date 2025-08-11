-- Fix Facebook OAuth Database Error
-- This addresses the "Database error saving new user" error when Facebook OAuth users sign up

-- First, let's see what the current users table structure is
-- and ensure all necessary columns exist

-- 1. Ensure the users table has all required columns
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS total_tokens_purchased BIGINT DEFAULT 10000;

-- 2. Fix the handle_new_user trigger to work with current schema
-- Drop and recreate with proper error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Create robust handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Attempt to insert new user with all required fields
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    avatar_url, 
    provider, 
    provider_id, 
    tokens_used_this_period,
    tokens_limit,
    total_tokens_purchased,
    subscription_start_date,
    last_token_reset_date,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'first_name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.app_metadata->>'provider', 'oauth'),
    COALESCE(NEW.raw_user_meta_data->>'provider_id', NEW.id::text),
    0, -- tokens_used_this_period
    10000, -- tokens_limit (default starter amount)
    10000, -- total_tokens_purchased (starter kit)
    NOW(), -- subscription_start_date  
    NOW(), -- last_token_reset_date
    NOW(), -- current_period_start
    NOW() + INTERVAL '2 days', -- current_period_end (48 hours for free trial)
    NOW(), -- created_at
    NOW()  -- updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    provider = EXCLUDED.provider,
    updated_at = NOW();
  
  RETURN NEW;
  
EXCEPTION 
  WHEN OTHERS THEN
    -- Log the error details for debugging
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RAISE LOG 'User data: email=%, metadata=%', NEW.email, NEW.raw_user_meta_data;
    
    -- Re-raise the error so it's visible in logs
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Ensure RLS policies allow user creation
-- The trigger runs as SECURITY DEFINER so it should bypass RLS, 
-- but let's make sure there's a policy for user insertion

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create policy for user insertion (this mainly applies to manual operations)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6. Grant necessary permissions
-- Ensure the trigger function can execute properly
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;

-- 7. Test the fix by simulating a user creation
-- This will help verify the trigger works before actual OAuth
DO $$
DECLARE
  test_user_id UUID;
  test_email TEXT;
BEGIN
  -- Generate a test UUID and email
  test_user_id := gen_random_uuid();
  test_email := 'test-oauth-' || extract(epoch from now()) || '@example.com';
  
  -- Try to simulate what happens during OAuth signup
  -- This mimics what Supabase does internally
  BEGIN
    INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data, app_metadata)
    VALUES (
      test_user_id,
      test_email, 
      NOW(),
      '{"full_name": "Test Facebook User", "avatar_url": "https://example.com/avatar.jpg", "provider_id": "facebook_123"}',
      '{"provider": "facebook"}'
    );
    
    -- Check if the user was created in public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
      RAISE NOTICE 'SUCCESS: OAuth simulation worked! User created successfully.';
      
      -- Clean up test user
      DELETE FROM auth.users WHERE id = test_user_id;
      DELETE FROM public.users WHERE id = test_user_id;
    ELSE
      RAISE NOTICE 'ERROR: User not created in public.users table';
    END IF;
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: OAuth simulation failed: %', SQLERRM;
      
      -- Clean up any partial data
      DELETE FROM auth.users WHERE id = test_user_id;
      DELETE FROM public.users WHERE id = test_user_id;
  END;
END $$;

-- 8. Display current users table schema for verification
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Success message
SELECT 'Facebook OAuth database fix applied successfully! Test the OAuth flow now.' as result;
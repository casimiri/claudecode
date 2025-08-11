-- CRITICAL FIX: Database trigger error - app_metadata field doesn't exist
-- Error: record "new" has no field "app_metadata" (SQLSTATE 42703)
-- Solution: Use correct field names from auth.users table structure

-- 1. Drop the current problematic trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create corrected handle_new_user function with proper field references
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user with correct field references from auth.users table
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
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- Extract name from raw_user_meta_data (correct field name)
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'first_name'
    ),
    -- Extract avatar from raw_user_meta_data
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url', 
      NEW.raw_user_meta_data->>'picture'
    ),
    -- Use raw_app_meta_data instead of app_metadata (correct field name)
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    -- Provider ID from user metadata or fallback to user ID
    COALESCE(NEW.raw_user_meta_data->>'provider_id', NEW.id::text),
    0, -- tokens_used_this_period
    10000, -- tokens_limit (default free tier)
    10000, -- total_tokens_purchased (starter amount)
    NOW(),
    NOW()
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
    -- Enhanced logging with actual field names
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RAISE LOG 'Available fields: id=%, email=%, raw_user_meta_data=%, raw_app_meta_data=%', 
              NEW.id, NEW.email, NEW.raw_user_meta_data, NEW.raw_app_meta_data;
    
    -- Still allow the auth.users record to be created even if our trigger fails
    RAISE WARNING 'User profile creation failed but auth record created: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Test the corrected trigger
DO $$
DECLARE
  test_user_id UUID;
  test_email TEXT;
  user_created BOOLEAN := FALSE;
BEGIN
  -- Generate test data
  test_user_id := gen_random_uuid();
  test_email := 'test-facebook-' || extract(epoch from now()) || '@example.com';
  
  -- Test Facebook OAuth simulation with correct field names
  BEGIN
    INSERT INTO auth.users (
      id, 
      email, 
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data  -- Use correct field name
    )
    VALUES (
      test_user_id,
      test_email,
      NOW(),
      jsonb_build_object(
        'full_name', 'Test Facebook User',
        'avatar_url', 'https://graph.facebook.com/v12.0/123456789/picture',
        'provider_id', 'facebook_123456789',
        'name', 'Test User',
        'picture', 'https://graph.facebook.com/v12.0/123456789/picture'
      ),
      jsonb_build_object('provider', 'facebook')  -- Correct metadata structure
    );
    
    -- Verify user was created in public.users
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = test_user_id) INTO user_created;
    
    IF user_created THEN
      RAISE NOTICE 'SUCCESS: Facebook OAuth trigger test passed!';
      RAISE NOTICE 'User profile created successfully with provider: facebook';
    ELSE
      RAISE NOTICE 'ERROR: User not created in public.users table';
    END IF;
    
    -- Cleanup
    DELETE FROM auth.users WHERE id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Test failed with: %', SQLERRM;
      -- Cleanup on error
      DELETE FROM auth.users WHERE id = test_user_id;
      DELETE FROM public.users WHERE id = test_user_id;
  END;
END $$;

-- 5. Show the corrected function
SELECT 'Database trigger fixed - using raw_app_meta_data instead of app_metadata!' as result;

-- 6. Verify auth.users table structure to confirm field names
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'auth' 
  AND table_name = 'users' 
  AND column_name IN ('app_metadata', 'raw_app_meta_data', 'raw_user_meta_data', 'user_metadata')
ORDER BY column_name;
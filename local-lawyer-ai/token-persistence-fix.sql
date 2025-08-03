-- Token Persistence and Subscription-Based Reset Fix
-- This migration fixes token usage persistence and implements proper subscription-date-based resets

-- 1. Add subscription tracking columns to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_token_reset_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');

-- 2. Update existing users to have proper subscription dates
UPDATE public.users 
SET 
  subscription_start_date = COALESCE(created_at, NOW()),
  last_token_reset_date = COALESCE(period_start_date, NOW()),
  current_period_start = COALESCE(period_start_date, NOW()),
  current_period_end = COALESCE(period_end_date, NOW() + INTERVAL '30 days')
WHERE subscription_start_date IS NULL;

-- 3. Create function to calculate next reset date based on subscription plan and start date
CREATE OR REPLACE FUNCTION calculate_next_reset_date(
  subscription_start TIMESTAMPTZ,
  plan_type TEXT
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  interval_duration INTERVAL;
  periods_elapsed INTEGER;
  next_reset TIMESTAMPTZ;
BEGIN
  -- Determine interval based on plan
  CASE plan_type
    WHEN 'weekly' THEN interval_duration := INTERVAL '7 days';
    WHEN 'monthly' THEN interval_duration := INTERVAL '30 days';
    WHEN 'yearly' THEN interval_duration := INTERVAL '365 days';
    ELSE interval_duration := INTERVAL '30 days'; -- default for free
  END CASE;
  
  -- Calculate how many complete periods have elapsed
  periods_elapsed := FLOOR(EXTRACT(EPOCH FROM (NOW() - subscription_start)) / EXTRACT(EPOCH FROM interval_duration));
  
  -- Calculate next reset date
  next_reset := subscription_start + (interval_duration * (periods_elapsed + 1));
  
  RETURN next_reset;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to get current period boundaries
CREATE OR REPLACE FUNCTION get_current_token_period(
  subscription_start TIMESTAMPTZ,
  plan_type TEXT
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  period_number INTEGER
) AS $$
DECLARE
  interval_duration INTERVAL;
  periods_elapsed INTEGER;
BEGIN
  -- Determine interval based on plan
  CASE plan_type
    WHEN 'weekly' THEN interval_duration := INTERVAL '7 days';
    WHEN 'monthly' THEN interval_duration := INTERVAL '30 days';
    WHEN 'yearly' THEN interval_duration := INTERVAL '365 days';
    ELSE interval_duration := INTERVAL '30 days'; -- default for free
  END CASE;
  
  -- Calculate how many complete periods have elapsed
  periods_elapsed := FLOOR(EXTRACT(EPOCH FROM (NOW() - subscription_start)) / EXTRACT(EPOCH FROM interval_duration));
  
  -- Calculate current period boundaries
  period_start := subscription_start + (interval_duration * periods_elapsed);
  period_end := subscription_start + (interval_duration * (periods_elapsed + 1));
  period_number := periods_elapsed + 1;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 5. Update function to reset user tokens based on subscription date
CREATE OR REPLACE FUNCTION reset_user_tokens_if_needed(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
  current_period RECORD;
  token_limit INTEGER;
  needs_reset BOOLEAN := FALSE;
BEGIN
  -- Get user data
  SELECT * INTO user_record 
  FROM public.users 
  WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', user_uuid;
  END IF;
  
  -- Get current period boundaries
  SELECT * INTO current_period 
  FROM get_current_token_period(
    user_record.subscription_start_date, 
    user_record.subscription_plan
  );
  
  -- Check if we're in a new period
  IF user_record.current_period_end <= NOW() OR 
     user_record.current_period_start != current_period.period_start THEN
    needs_reset := TRUE;
  END IF;
  
  -- Reset if needed
  IF needs_reset THEN
    -- Get token limit for plan
    SELECT tokens_per_period INTO token_limit
    FROM public.subscription_limits 
    WHERE plan_type = user_record.subscription_plan;
    
    IF NOT FOUND THEN
      token_limit := 10000; -- default for free plan
    END IF;
    
    -- Update user with new period and reset tokens
    UPDATE public.users
    SET 
      tokens_used_this_period = 0,
      tokens_limit = token_limit,
      current_period_start = current_period.period_start,
      current_period_end = current_period.period_end,
      last_token_reset_date = NOW(),
      period_start_date = current_period.period_start,
      period_end_date = current_period.period_end
    WHERE id = user_uuid;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 6. Enhanced function to get user token stats with automatic reset check
CREATE OR REPLACE FUNCTION get_user_token_stats_with_reset(user_uuid UUID)
RETURNS TABLE (
  tokens_used INTEGER,
  tokens_limit INTEGER,
  tokens_remaining INTEGER,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  plan_type TEXT,
  usage_percentage NUMERIC,
  was_reset BOOLEAN
) AS $$
DECLARE
  user_record RECORD;
  reset_occurred BOOLEAN;
BEGIN
  -- First, check if reset is needed and perform it
  reset_occurred := reset_user_tokens_if_needed(user_uuid);
  
  -- Get updated user data
  SELECT 
    u.tokens_used_this_period,
    u.tokens_limit,
    u.current_period_start,
    u.current_period_end,
    u.subscription_plan,
    (u.tokens_limit - u.tokens_used_this_period) as remaining,
    CASE 
      WHEN u.tokens_limit > 0 THEN (u.tokens_used_this_period::NUMERIC / u.tokens_limit::NUMERIC * 100)
      ELSE 0
    END as percentage
  INTO user_record
  FROM public.users u
  WHERE u.id = user_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', user_uuid;
  END IF;
  
  -- Return the stats
  tokens_used := user_record.tokens_used_this_period;
  tokens_limit := user_record.tokens_limit;
  tokens_remaining := user_record.remaining;
  period_start := user_record.current_period_start;
  period_end := user_record.current_period_end;
  plan_type := user_record.subscription_plan;
  usage_percentage := user_record.percentage;
  was_reset := reset_occurred;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to reset all users who need period reset (for cron jobs)
CREATE OR REPLACE FUNCTION reset_all_expired_token_periods()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  plan_type TEXT,
  old_period_end TIMESTAMPTZ,
  new_period_end TIMESTAMPTZ
) AS $$
DECLARE
  user_record RECORD;
  reset_occurred BOOLEAN;
BEGIN
  -- Loop through all users and check for resets
  FOR user_record IN 
    SELECT id, email, subscription_plan, current_period_end
    FROM public.users
    WHERE subscription_status = 'active'
  LOOP
    -- Check if this user needs a reset
    SELECT reset_user_tokens_if_needed(user_record.id) INTO reset_occurred;
    
    IF reset_occurred THEN
      -- Get updated period end date
      SELECT u.current_period_end INTO user_record.current_period_end
      FROM public.users u WHERE u.id = user_record.id;
      
      -- Return the reset info
      user_id := user_record.id;
      email := user_record.email;
      plan_type := user_record.subscription_plan;
      old_period_end := user_record.current_period_end;
      new_period_end := user_record.current_period_end;
      
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. Update trigger to handle subscription plan changes
CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
  new_limit INTEGER;
BEGIN
  -- If subscription plan changed, update token limit and potentially reset period
  IF OLD.subscription_plan != NEW.subscription_plan THEN
    -- Get new token limit
    SELECT tokens_per_period INTO new_limit
    FROM public.subscription_limits 
    WHERE plan_type = NEW.subscription_plan;
    
    IF NOT FOUND THEN
      new_limit := 10000; -- default
    END IF;
    
    -- Update token limit
    NEW.tokens_limit := new_limit;
    
    -- If upgrading from free, reset the period to start fresh
    IF OLD.subscription_plan = 'free' AND NEW.subscription_plan != 'free' THEN
      NEW.subscription_start_date := NOW();
      NEW.tokens_used_this_period := 0;
      NEW.last_token_reset_date := NOW();
      
      -- Calculate new period based on new plan
      SELECT period_start, period_end INTO NEW.current_period_start, NEW.current_period_end
      FROM get_current_token_period(NEW.subscription_start_date, NEW.subscription_plan);
      
      NEW.period_start_date := NEW.current_period_start;
      NEW.period_end_date := NEW.current_period_end;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for subscription changes
DROP TRIGGER IF EXISTS handle_subscription_change_trigger ON public.users;
CREATE TRIGGER handle_subscription_change_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_subscription_change();

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION get_user_token_stats_with_reset(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_tokens_if_needed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_all_expired_token_periods() TO service_role;
GRANT EXECUTE ON FUNCTION calculate_next_reset_date(TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_token_period(TIMESTAMPTZ, TEXT) TO authenticated;

-- 11. Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_dates ON public.users(subscription_start_date, current_period_end);
CREATE INDEX IF NOT EXISTS idx_users_active_subscriptions ON public.users(subscription_status, subscription_plan);

-- Success message
SELECT 'Token persistence and subscription-based reset system implemented successfully!' as result;
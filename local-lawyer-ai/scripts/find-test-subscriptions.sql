-- Query to find users with test subscription IDs
-- Run this in Supabase SQL Editor or any PostgreSQL client

-- 1. Find users with test subscription IDs (starting with 'test_sub_')
SELECT 
  id,
  email,
  subscription_id,
  subscription_plan,
  subscription_status,
  created_at,
  updated_at
FROM users 
WHERE subscription_id LIKE 'test_sub_%'
ORDER BY created_at DESC;

-- 2. Find users with unusual subscription ID patterns (not standard Stripe format)
SELECT 
  id,
  email,
  subscription_id,
  subscription_plan,
  subscription_status,
  created_at
FROM users 
WHERE subscription_id IS NOT NULL 
  AND subscription_id NOT LIKE 'sub_%'  -- Standard Stripe subscription IDs start with 'sub_'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Count of users by subscription_id pattern
SELECT 
  CASE 
    WHEN subscription_id IS NULL THEN 'NULL'
    WHEN subscription_id LIKE 'sub_%' THEN 'Normal Stripe ID'
    WHEN subscription_id LIKE 'test_sub_%' THEN 'Test ID'
    ELSE 'Other Pattern'
  END as id_type,
  COUNT(*) as count
FROM users 
GROUP BY 
  CASE 
    WHEN subscription_id IS NULL THEN 'NULL'
    WHEN subscription_id LIKE 'sub_%' THEN 'Normal Stripe ID'
    WHEN subscription_id LIKE 'test_sub_%' THEN 'Test ID'
    ELSE 'Other Pattern'
  END
ORDER BY count DESC;

-- 4. CLEANUP SCRIPT - Use this to fix test subscription IDs
-- UNCOMMENT AND RUN ONLY AFTER CONFIRMING THE DATA ABOVE

/*
UPDATE users 
SET 
  subscription_id = NULL,
  subscription_plan = 'free',
  subscription_status = 'inactive',
  updated_at = NOW()
WHERE subscription_id LIKE 'test_sub_%';

-- Verify the cleanup
SELECT 
  id,
  email,
  subscription_id,
  subscription_plan,
  subscription_status
FROM users 
WHERE subscription_id LIKE 'test_sub_%';
*/

-- 5. Alternative: Show all users with their subscription details for manual review
SELECT 
  u.id,
  u.email,
  u.subscription_id,
  u.subscription_plan,
  u.subscription_status,
  u.stripe_customer_id,
  u.created_at
FROM users u
WHERE u.subscription_id IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 50;
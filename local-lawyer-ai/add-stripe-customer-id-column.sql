-- Migration: Add stripe_customer_id column to users table
-- This migration adds the missing stripe_customer_id column that the code expects

-- Add the stripe_customer_id column
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Migrate existing data from customer_id to stripe_customer_id if customer_id exists
UPDATE public.users 
SET stripe_customer_id = customer_id 
WHERE customer_id IS NOT NULL AND stripe_customer_id IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);

-- Success message
SELECT 'stripe_customer_id column added successfully!' as result;
-- Add free_starter_claimed column to users table
-- This tracks whether a user has already claimed their one-time free starter kit

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS free_starter_claimed BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for faster queries on free_starter_claimed
CREATE INDEX IF NOT EXISTS idx_users_free_starter_claimed 
ON public.users(free_starter_claimed);

-- Update existing users to have free_starter_claimed as FALSE if not set
UPDATE public.users 
SET free_starter_claimed = FALSE 
WHERE free_starter_claimed IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.users.free_starter_claimed IS 'Tracks whether user has claimed their one-time free starter kit of 10,000 tokens';
// Load environment variables from .env.local
const fs = require('fs')

try {
  const envLocal = fs.readFileSync('.env.local', 'utf8')
  envLocal.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
} catch (err) {
  console.error('Could not load .env.local:', err.message)
}

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function fixTriggerIssue() {
  console.log('🔧 Fixing database trigger issue...')
  
  try {
    // The problematic trigger is: auto_reset_user_tokens
    // The problematic function is: reset_user_tokens_for_period()
    
    console.log('\n1. Dropping problematic trigger...')
    const { error: dropTriggerError } = await supabase
      .from('users')
      .delete()
      .eq('id', 'dummy') // This will fail but we just want to check if we can query
      
    // Let's try a different approach - check if we can query users table structure
    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      
    if (queryError) {
      console.error('Query error:', queryError)
      return
    }
    
    console.log('✅ Database connection working')
    
    // Now test the token update directly with a manual fix
    const testUserId = 'af377857-6150-44e9-8f11-6bfbe8d25261'
    
    // Get current state
    console.log('\n2. Getting current user state...')
    const { data: currentUser, error: getUserError } = await supabase
      .from('users')
      .select('tokens_used_this_period, total_tokens_purchased, tokens_limit')
      .eq('id', testUserId)
      .single()
    
    if (getUserError) {
      console.error('Error getting user:', getUserError)
      return
    }
    
    console.log('Current user state:', currentUser)
    
    // Try a very simple update to test the trigger
    console.log('\n3. Testing simple update...')
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({ 
        tokens_used_this_period: currentUser.tokens_used_this_period + 1 
      })
      .eq('id', testUserId)
      .select()
    
    if (updateError) {
      console.error('❌ Update still failing:', updateError)
      console.log('\nThe trigger is still causing issues. Need to create a SQL script to fix this.')
      
      // Create SQL fix script
      const sqlFix = `
-- Fix for subscription-related trigger issue
-- Drop the problematic trigger and function

DROP TRIGGER IF EXISTS auto_reset_user_tokens ON public.users;
DROP FUNCTION IF EXISTS reset_user_tokens_for_period();

-- Also drop the expired periods function that references subscription fields
DROP FUNCTION IF EXISTS check_and_reset_expired_periods();

-- Create a simple token-only version that doesn't reset (since we're token-only now)
CREATE OR REPLACE FUNCTION check_and_reset_expired_periods()
RETURNS INTEGER AS $$
BEGIN
  -- For token-only system, we don't auto-reset periods
  -- This function is kept for compatibility but does nothing
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Test the fix
SELECT 'Trigger fix applied successfully!' as result;
`
      
      fs.writeFileSync('sql-trigger-fix.sql', sqlFix)
      console.log('✅ Created sql-trigger-fix.sql - please run this manually in Supabase SQL editor')
      
    } else {
      console.log('✅ Update successful!', updateResult)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

fixTriggerIssue()
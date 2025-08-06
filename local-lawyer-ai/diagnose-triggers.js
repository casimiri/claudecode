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

async function diagnoseTriggers() {
  console.log('🔍 Diagnosing database triggers and functions...')
  
  try {
    // Test a simple update first to see the exact error
    const testUserId = 'af377857-6150-44e9-8f11-6bfbe8d25261'
    
    console.log('\n1. Testing simple column update to see exact trigger error...')
    
    // Try updating just the updated_at field
    const { error: timestampError } = await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', testUserId)
    
    if (timestampError) {
      console.error('❌ Timestamp update error:', timestampError)
    } else {
      console.log('✅ Timestamp update works')
    }
    
    // Try updating tokens_used_this_period
    console.log('\n2. Testing token field update...')
    const { data: currentUser } = await supabase
      .from('users')
      .select('tokens_used_this_period')
      .eq('id', testUserId)
      .single()
    
    const { error: tokenError } = await supabase
      .from('users')  
      .update({ tokens_used_this_period: currentUser.tokens_used_this_period })
      .eq('id', testUserId)
    
    if (tokenError) {
      console.error('❌ Token update error:', tokenError)
      
      // Parse the error to understand which field is problematic
      if (tokenError.message.includes('subscription_plan')) {
        console.log('🎯 DIAGNOSIS: The issue is with subscription_plan field reference')
      } else if (tokenError.message.includes('period_end_date')) {
        console.log('🎯 DIAGNOSIS: The issue is with period_end_date field reference') 
      }
    } else {
      console.log('✅ Token update works')
    }
    
    console.log('\n3. Based on the errors, I can create a more targeted fix...')
    
  } catch (error) {
    console.error('Diagnosis failed:', error)
  }
}

diagnoseTriggers()
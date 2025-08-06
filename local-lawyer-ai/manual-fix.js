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

async function manualFix() {
  console.log('Testing token update directly...')
  
  try {
    // Test a direct update to see if the trigger is still causing issues
    const testUserId = 'af377857-6150-44e9-8f11-6bfbe8d25261'
    
    console.log('Testing direct token update...')
    const { data, error } = await supabase
      .from('users')
      .update({ tokens_used_this_period: 24653 })
      .eq('id', testUserId)
      .select()
    
    if (error) {
      console.error('❌ Update failed:', error)
    } else {
      console.log('✅ Update successful:', data)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

manualFix()
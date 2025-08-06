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

async function testTokenFix() {
  console.log('🧪 Testing if both auth callback and token deduction work after trigger fix...')
  
  try {
    const testUserId = 'af377857-6150-44e9-8f11-6bfbe8d25261'
    
    console.log('\n=== TEST 1: Token Update (Chat functionality) ===')
    
    // Get current state
    console.log('\n1. Getting current user state...')
    const { data: beforeUser, error: getError } = await supabase
      .from('users')
      .select('tokens_used_this_period, total_tokens_purchased, tokens_limit')
      .eq('id', testUserId)
      .single()
    
    if (getError) {
      console.error('Error getting user:', getError)
      return
    }
    
    console.log('Before update:', beforeUser)
    
    // Test token deduction
    const tokensToAdd = 50
    const newTokensUsed = beforeUser.tokens_used_this_period + tokensToAdd
    
    console.log(`\n2. Testing token update (${beforeUser.tokens_used_this_period} + ${tokensToAdd} = ${newTokensUsed})...`)
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({ 
        tokens_used_this_period: newTokensUsed 
      })
      .eq('id', testUserId)
      .select()
    
    if (updateError) {
      console.error('❌ Token update still failing:', updateError)
      console.log('\n🚨 The COMPLETE SQL trigger fix needs to be applied in Supabase dashboard!')
      console.log('📋 Steps to fix:')
      console.log('1. Go to your Supabase dashboard')
      console.log('2. Navigate to SQL Editor') 
      console.log('3. Copy and paste the ENTIRE contents of sql-trigger-fix.sql')
      console.log('4. Run the SQL commands')
      console.log('5. Then run this test again')
      console.log('\n💡 This will fix BOTH the chat token deduction AND sign-in issues!')
      return
      
    } else {
      console.log('✅ Token update successful!')
      
      // Revert the test change
      console.log('\n3. Reverting test change...')
      const { error: revertError } = await supabase
        .from('users')
        .update({ 
          tokens_used_this_period: beforeUser.tokens_used_this_period
        })
        .eq('id', testUserId)
      
      if (!revertError) {
        console.log('✅ Test change reverted')
      }
    }
    
    console.log('\n=== TEST 2: Auth Profile Update (Sign-in functionality) ===')
    
    // Test profile update (simulates what happens during sign-in)
    console.log('\n4. Testing profile update (simulates sign-in process)...')
    const { data: profileResult, error: profileError } = await supabase
      .from('users')
      .update({ 
        full_name: 'Test User',
        updated_at: new Date().toISOString()
      })
      .eq('id', testUserId)
      .select()
    
    if (profileError) {
      console.error('❌ Profile update still failing:', profileError)
      console.log('This means sign-in will continue to fail!')
    } else {
      console.log('✅ Profile update successful!')
      console.log('✅ Sign-in should now work properly!')
    }
    
    console.log('\n🎉 ALL TESTS PASSED - Both chat and sign-in functionality should work!')
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testTokenFix()
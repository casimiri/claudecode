// Load environment variables from .env.local
const fs = require('fs')
const path = require('path')

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

async function fixDatabase() {
  console.log('Starting database fixes...')
  
  try {
    // 1. Drop problematic triggers first
    console.log('\n1. Dropping existing triggers...')
    const dropTriggers = [
      'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE',
      'DROP TRIGGER IF EXISTS update_users_updated_at ON public.users CASCADE'
    ]
    
    for (const sql of dropTriggers) {
      console.log('Executing:', sql)
      const { error } = await supabase.rpc('exec_sql', { sql_text: sql })
      if (error) console.error('Error:', error.message)
      else console.log('✅ Success')
    }
    
    // 2. Create clean update_updated_at function
    console.log('\n2. Creating updated_at trigger function...')
    const updateFunction = `
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'`
    
    const { error: funcError } = await supabase.rpc('exec_sql', { sql_text: updateFunction })
    if (funcError) {
      console.error('Error creating function:', funcError.message)
    } else {
      console.log('✅ Function created')
    }
    
    // 3. Create clean trigger
    console.log('\n3. Creating updated_at trigger...')
    const createTrigger = `
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON public.users
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column()`
    
    const { error: triggerError } = await supabase.rpc('exec_sql', { sql_text: createTrigger })
    if (triggerError) {
      console.error('Error creating trigger:', triggerError.message)
    } else {
      console.log('✅ Trigger created')
    }
    
    console.log('\n🎉 Database fixes complete!')
    
  } catch (error) {
    console.error('Failed to fix database:', error)
    process.exit(1)
  }
}

fixDatabase()
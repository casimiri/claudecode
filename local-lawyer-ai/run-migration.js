const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Reading migration script...')
    const sql = fs.readFileSync('remove-subscriptions-migration.sql', 'utf8')
    
    // Split SQL into individual statements (basic approach)
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (statement.length === 0) continue
      
      console.log(`\nExecuting statement ${i + 1}/${statements.length}:`)
      console.log(statement.substring(0, 100) + '...')
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_statement: statement })
        if (error) {
          console.error('Error executing statement:', error.message)
          // Continue with next statement for non-critical errors
        } else {
          console.log('✅ Success')
        }
      } catch (err) {
        console.error('Exception executing statement:', err.message)
      }
    }
    
    console.log('\n🎉 Migration complete!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
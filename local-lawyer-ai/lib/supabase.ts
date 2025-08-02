import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use SSR-compatible client for browser
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Create admin client - this will only work on the server side
function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin should only be used on the server side')
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Lazy initialization - only create when actually used
let _supabaseAdmin: ReturnType<typeof createAdminClient> | null = null

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createAdminClient()
  }
  return _supabaseAdmin
}

// Use a getter to create the client lazily
export const supabaseAdmin = new Proxy({} as any, {
  get: function(target, prop) {
    const client = getSupabaseAdmin()
    return client[prop as keyof typeof client]
  }
})
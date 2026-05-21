const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cliente público (para operaciones normales con RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Cliente admin (bypasa RLS - solo para operaciones de administrador en el backend)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = { supabase, supabaseAdmin };

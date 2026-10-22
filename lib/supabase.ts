import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jbrfuwgcokwwcbmbzeqp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicmZ1d2djb2t3d2NibWJ6ZXFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDUwMjI1NSwiZXhwIjoyMDk2MDc4MjU1fQ.075eSdM8Y1spaIwpeXvLerqL93BQkKk8g4j8KCMqmK4';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicmZ1d2djb2t3d2NibWJ6ZXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDIyNTUsImV4cCI6MjA5NjA3ODI1NX0.48KNxR9u3R9CnSJtO_h5gs14GEJIfMY8Qq49CSjKLBQ';

// Server-side admin client using service_role key with full privileges
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Client-side/public client using anon key
export const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

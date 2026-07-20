import { AuthError, PostgrestError } from '@supabase/supabase-js';

export interface DbAuthError {
  error: AuthError | null;
}

export interface DbPostgrestError {
  error: PostgrestError | null;
}

import { Profiles } from '../profile';
import { PostgrestError } from '@supabase/supabase-js';

export interface SupabaseResponseProfiles {
  data: Profiles | null;
  error: PostgrestError | null;
}

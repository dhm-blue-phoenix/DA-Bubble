import { Profiles } from '../profile';
import { PostgrestError } from '@supabase/supabase-js';

export type SupabaseResponseProfiles = { data: Profiles | null; error: PostgrestError | null };

import { Message } from '../messages';
import { PostgrestError } from '@supabase/supabase-js';

export interface ReactionResult {
  action: 'added' | 'removed';
}
export interface SupabaseResponseMessage {
  data: Message;
  error: PostgrestError;
}

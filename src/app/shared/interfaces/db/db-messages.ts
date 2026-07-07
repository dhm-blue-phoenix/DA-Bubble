import { Message } from '../messages';
import { PostgrestError } from '@supabase/supabase-js';

export interface ReactionResult {
  action: 'added' | 'removed';
}
export interface SupabaseResponseMessage {
  data: Message;
  error: PostgrestError;
}

export interface NewMessage {
  chat_id?: string;
  channel_id?: string;
  thread_id?: string;
  sender_id: string;
  content: string;
}

export type MsgType = 'chat' | 'channel' | 'thread';

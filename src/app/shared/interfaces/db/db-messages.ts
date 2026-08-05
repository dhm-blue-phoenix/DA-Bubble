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
  readonly chat_id?: string;
  readonly channel_id?: string;
  readonly thread_id?: string;
  readonly sender_id: string;
  readonly content: string;
  readonly thread_only?: boolean;
}

export type MsgType = 'chat' | 'channel' | 'thread';

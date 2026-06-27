export interface Message {
  readonly id: string;
  readonly sender_id: string;
  content: string;
  reactions: Reactions;
  readonly channel_id: string | null;
  readonly chat_id: string | null;
  readonly thread_id: string | null;
  readonly created_at: string;
  edited_at: string | null;
}

export interface Reaction {
  readonly message_id: string;
  readonly user_id: string;
  emoji: string;
  readonly created_at: string;
}

export type Messages = Message[];
export type Reactions = Reaction[];

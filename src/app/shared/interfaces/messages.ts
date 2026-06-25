export interface Message {
  readonly id: string;
  readonly sender_id: string;
  content: string;
  readonly channel_id: string;
  readonly chat_id: string;
  readonly thread_id: string;
  readonly created_at: string;
  edited_at: string;
}

export interface Reaction {
  readonly message_id: string;
  readonly user_id: string;
  emoji: string;
  readonly created_at: string;
}

export type Messages = Message[];
export type Reactions = Reaction[];

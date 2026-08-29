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
  readonly threads?: { id: string } | null;
  readonly replyCount?: number;
  readonly thread_only?: boolean;
}

export interface SearchMessage {
  readonly id: string;
  readonly content: string;
  readonly channel_id: string | null;
  readonly chat_id: string | null;
  readonly thread_id: string | null;
  readonly created_at: string;
}

export interface Reaction {
  readonly message_id: string;
  readonly user_id: string;
  emoji: string;
  readonly created_at: string;
}

export interface SearchResultView {
  id: string;
  content: string;
  label: string;
  date: string;
  type: 'chat' | 'channel';
  targetId: string;
}

export type Messages = Message[];
export type SearchMessages = SearchMessage[];
export type Reactions = Reaction[];

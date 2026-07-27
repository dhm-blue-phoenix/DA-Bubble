export interface Chat {
  readonly id: string;
  readonly created_at: string;
}

export interface ChatMember {
  readonly chat_id: string;
  readonly user_id: string;
  readonly joined_at: string;
}

export interface SenderId {
  user_id: string;
}

export type Chats = Chat[];
export type ChatMembers = ChatMember[];
export type SenderIds = SenderId[];

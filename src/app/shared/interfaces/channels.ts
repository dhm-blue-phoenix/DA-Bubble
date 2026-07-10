export interface Channel {
  readonly id: string;
  name: string;
  description: string;
  readonly created_by: string;
  readonly created_at: string;
  edited_at: string;
  channel_members?: { user_id: string }[];
}

export interface ChannelMember {
  readonly channel_id: string;
  readonly user_id: string;
  readonly role: 'admin' | 'member';
  readonly joined_at: string;
}

export interface Threads {
  readonly id: string;
  readonly root_message_id: string;
  readonly created_at: string;
}

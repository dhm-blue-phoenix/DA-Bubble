export interface ChannelId {
  channel_id: string;
  channels: object;
}

export interface ChannelIdAndName {
  id: string;
  name: string;
}

export type SignalChannels = ChannelIdAndName[];

export interface Channel {
  id: string;
  name: string;
  description: string;
  created_at: string;
  channel_members: { user_id: string }[];
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  role: string;
}

export type SignalChannel = Channel | object;

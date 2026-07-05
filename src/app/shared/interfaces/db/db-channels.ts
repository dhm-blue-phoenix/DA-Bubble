export interface ChannelId {
  channel_id: string;
  channels: object;
}

export interface ChannelIdAndName {
  id: string;
  name: string;
}

interface ReturnErrorFromCreateNewChannel {
  success: false;
  msg: 'Duplicate found';
}

export type ReturnFromCreateNewChannel = void | ReturnErrorFromCreateNewChannel;

export type SignalChannels = ChannelIdAndName[];

interface Channel {
  id: string;
  name: string;
  description: string;
  created_at: string;
  channel_members: { user_id: string }[];
}

export type SignalChannel = Channel | object;

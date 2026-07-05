import { inject, Injectable, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  SupabaseClient,
  PostgrestSingleResponse,
  PostgrestResponse,
  RealtimeChannel,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

interface ChannelId {
  channel_id: string;
  channels: object;
}

interface ChannelIdAndName {
  id: string;
  name: string;
}

interface ReturnChannelIds {
  success: boolean;
  channelData: ChannelIdAndName[] | [];
}

interface ReturnErrorFromCreateNewChannel {
  success: false;
  msg: 'Duplicate found';
}
type ReturnFromCreateNewChannel = void | ReturnErrorFromCreateNewChannel;

@Injectable({
  providedIn: 'root',
})
export class DatabaseChannels {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly channels?: RealtimeChannel;

  public readonly _channels: WritableSignal<any> = signal<any>([]); // Wichtig: In Arbeit: channel ids + names
  public readonly _channel: WritableSignal<any> = signal<any>([]); // Wichtig: In Arbeit: Channel daten

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.debbug();
    }
  }

  private async debbug(): Promise<void> {
    const data: ReturnChannelIds = await this.getChannelIds('631b4bad-b6ee-439a-b9e8-e366d03afa39');
    console.log(data);
    data.channelData.forEach((channelId: any): any => {
      console.log(channelId);
      this.getChannelData(channelId.id);
    });
    //this.createNewChannel('631b4bad-b6ee-439a-b9e8-e366d03afa39', 'My Channel15', '...');
    //this.updateChannelData('06fb25c7-857c-460e-abc6-b478c03174e7', 'First Channel', '...');
  }

  private async getChannelIds(userId: string): Promise<ReturnChannelIds> {
    const { data }: PostgrestSingleResponse<ChannelId[] | []> = await this.supabase
      .from('channel_members')
      .select('channel_id, channels(name)')
      .eq('user_id', userId);
    if (data && data.length > 0) {
      const returnData: ChannelIdAndName[] = data.map((channel: ChannelId): ChannelIdAndName => {
        const channelName: { name: string } = channel['channels'] as { name: string };
        return { id: channel['channel_id'], name: channelName['name'] };
      });
      return { success: true, channelData: returnData };
    }
    return { success: false, channelData: [] };
  }

  private async getChannelData(channelId: string): Promise<void> {
    const { data } = await this.supabase
      .from('channels')
      .select('id, name, description, created_by, channel_members(user_id)')
      .eq('id', channelId);

    if (data && data.length > 0) {
      console.log(data[0]);
    }
  }

  public async createNewChannel(
    userId: string,
    name: string,
    description: string,
  ): Promise<ReturnFromCreateNewChannel> {
    if (await this.checkDuplicateCannelName(name))
      return { success: false, msg: 'Duplicate found' };
    const { data }: PostgrestSingleResponse<{ id: string }[]> = await this.supabase
      .from('channels')
      .insert({
        name: name,
        description: description,
        created_by: userId,
      })
      .select();
    if (data && data.length > 0) this.createNewMember(data[0]['id'], userId, 'admin');
  }

  private async checkDuplicateCannelName(name: string): Promise<boolean> {
    const { data }: PostgrestSingleResponse<Object[]> = await this.supabase
      .from('channels')
      .select('name')
      .eq('name', name);
    return !!(data && data.length > 0);
  }

  public async createNewMember(
    channelId: string,
    userId: string,
    role: 'admin' | 'member',
  ): Promise<void> {
    await this.supabase
      .from('channel_members')
      .insert({
        channel_id: channelId,
        user_id: userId,
        role: role,
      })
      .select();
  }

  public async removeMember(channelId: string, userId: string): Promise<void> {
    await this.supabase
      .from('channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', userId);
  }

  public async updateChannelData(
    channelId: string,
    name: string,
    description: string,
  ): Promise<void> {
    await this.supabase
      .from('channels')
      .update({
        name: name,
        description: description,
        edited_at: new Date().toISOString(),
      })
      .eq('id', channelId)
      .select();
  }
}

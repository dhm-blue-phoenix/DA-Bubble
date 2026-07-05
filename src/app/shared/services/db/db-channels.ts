import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { SupabaseClient, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';
import { dateTimestampProvider } from 'rxjs/internal/scheduler/dateTimestampProvider';

interface ChannelMemberRow {
  channel_id: string;
  channels: {
    name: string;
  };
}

type ChannelId = { channel_id: string };
type ReturnChannelIds = { success: boolean; channelIds: string[] | [] };
type ChannelIdsResponse = ChannelId[] | [];

@Injectable({
  providedIn: 'root',
})
export class DatabaseChannels {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.debbug();
    }
  }

  private async debbug() {
    //this.createNewChannel('631b4bad-b6ee-439a-b9e8-e366d03afa39', 'My Channel15', '...');
  }

  private async getChannelIds(userId: string): Promise<ReturnChannelIds> {
    const { data }: PostgrestSingleResponse<ChannelId[] | []> = await this.supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', userId);
    if (data && data.length > 0) {
      const ids: string[] = data.map((channel: ChannelId): string => {
        return channel['channel_id'];
      });
      return { success: true, channelIds: ids };
    }
    return { success: false, channelIds: [] };
  }

  private async createNewChannel(userId: string, name: string, description: string): Promise<void> {
    if (await this.checkDuplicateCannelName(userId, name)) return; // Eventuelle Ergenzente Rückgabewerte
    const { data }: PostgrestSingleResponse<{ id: string }[]> = await this.supabase
      .from('channels')
      .insert({
        name: name,
        description: description,
        created_by: userId
      })
      .select();
    if (data && data.length > 0) this.createNewMember(data[0]['id'], userId, 'admin');
  }

  private async checkDuplicateCannelName(userId: string, name: string): Promise<boolean> {
    const { data }: PostgrestSingleResponse<Object[]> = await this.supabase
      .from('channels')
      .select('name')
      .eq('created_by', userId)
      .eq('name', name);
    return !!(data && data.length > 0);
  }

  private async createNewMember(channelId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    await this.supabase.from('channel_members')
      .insert({
        channel_id: channelId,
        user_id: userId,
        role: role
      })
      .select();
  }
}

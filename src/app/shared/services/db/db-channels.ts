import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { SupabaseClient, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

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
    const data = await this.getChannelIds('631b4bad-b6ee-439a-b9e8-e366d03afa39');
    console.warn(data);
  }


  /**
   * Ladet die Channel Ids wo man mitglid ist also admin und member
   * */
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
}

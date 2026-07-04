import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { SupabaseClient, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';


type ChannelId = string | null;
type ExistChannelId = { success: boolean; channel_id: ChannelId[] };

@Injectable({
  providedIn: 'root',
})
export class DatabaseChannels {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkExistChannel('daww');
    }
  }

  /*
   * Wichtig: Alle Tabellen von Channel sind noch nicht freigegeben in Superbase
   * */

  // Editing + Duplikats Prüfung namen
  private async checkExistChannel(currentUserId: string): Promise<ExistChannelId> {
    const { data: channel_ids }: PostgrestResponse<{ channel_id: string }> = await this.supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', currentUserId)
      .eq('role', 'admin');
    if (channel_ids) {
      const ids: string[] = channel_ids.map((channel: { channel_id: string }): string => {
        return channel['channel_id'];
      });
      return { success: true, channel_id: ids };
    }
    return { success: false, channel_id: [] };
  }

  // Editing
  private async createNewChannel(
    currentUserId: string,
    name: string,
    description: string,
  ): Promise<ChannelId> {
    const { data: newChannel, error }: PostgrestSingleResponse<any> = await this.supabase
      .from('channels')
      .insert({
        name: name,
        description: description,
        created_by: currentUserId,
      })
      .select()
      .single();
    return newChannel['id'];
  }

  /*
  public async getChannelId(
    currentUserId: string,
    name: string,
    description: string,
  ): Promise<ChannelId> {
    const existChat: ExistChannel = await this.checkExistChat(currentUserId, otherUserId);
    if (!existChat['success']) return this.createNewChat(currentUserId, otherUserId);
    return existChat['channel_id'];
  }
  */
}

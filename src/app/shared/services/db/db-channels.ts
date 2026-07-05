import { inject, Injectable, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  SupabaseClient,
  PostgrestSingleResponse,
  PostgrestResponse,
  RealtimeChannel,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

type ChannelId = { channel_id: string };
type ReturnChannelIds = { success: boolean; channelIds: string[] | [] };

@Injectable({
  providedIn: 'root',
})
export class DatabaseChannels {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly channels?: RealtimeChannel;

  public readonly _channels: WritableSignal<any> = signal<any>([]); // Wichtig: In Arbeit

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      //this.debbug();
    }
  }

  private async debbug() {
    const data: ReturnChannelIds = await this.getChannelIds('631b4bad-b6ee-439a-b9e8-e366d03afa39');
    data.channelIds.forEach((channelId: string): void => {
      this.getChannelData(channelId);
    });

    //this.createNewChannel('631b4bad-b6ee-439a-b9e8-e366d03afa39', 'My Channel15', '...');
    //this.updateChannelData('06fb25c7-857c-460e-abc6-b478c03174e7', 'First Channel', '...');
  }

  // ----
  // Evenutell Funktion Löschen
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

  private async getChannelData(channelId: string): Promise<void> {
    const { data } = await this.supabase
      .from('channels')
      .select('id, name, description, created_by, channel_members(profiles(avatar, name, status))')
      .eq('id', channelId);

    if (data && data.length > 0) {
      console.log(data[0]);
    }
  }
  // ----

  public async createNewChannel(userId: string, name: string, description: string): Promise<void> {
    if (await this.checkDuplicateCannelName(userId, name)) return; // Eventuelle Ergenzente Rückgabewerte
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

  private async checkDuplicateCannelName(userId: string, name: string): Promise<boolean> {
    const { data }: PostgrestSingleResponse<Object[]> = await this.supabase
      .from('channels')
      .select('name')
      .eq('created_by', userId)
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
  };

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

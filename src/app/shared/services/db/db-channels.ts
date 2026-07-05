import { inject, Injectable, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  SupabaseClient,
  PostgrestSingleResponse,
  PostgrestResponse,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import {
  ChannelId,
  ReturnFromCreateNewChannel,
  SignalChannels,
  SignalChannel,
  ChannelIdAndName,
} from '../../interfaces/db/db-channels';

@Injectable({
  providedIn: 'root',
})
export class DatabaseChannels {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly channels?: RealtimeChannel;

  public readonly _channels: WritableSignal<SignalChannels> = signal<SignalChannels>([]);
  public readonly _channel: WritableSignal<SignalChannel> = signal<SignalChannel>({});

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.channels = this.subscribeChannels();
      this.debugging();
    }
  }

  private async debugging() {
    this.getChannelIds('631b4bad-b6ee-439a-b9e8-e366d03afa39');
    this.getChannelData('06fb25c7-857c-460e-abc6-b478c03174e7');
  }

  // -- In Arbeit
  private subscribeChannels(): RealtimeChannel {
    return this.supabase
      .channel('realtime:channels')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_members' },
        (payload: RealtimePostgresChangesPayload<object>): void =>
          this.handleChannelsEvent(payload),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        (payload: RealtimePostgresChangesPayload<object>): void =>
          this.handleChannelsEvent(payload),
      )
      .subscribe();
  }

  private handleChannelsEvent(payload: RealtimePostgresChangesPayload<object>): void {
    const { table, eventType }: { table: string, eventType: string} = payload;
    if (table === 'channels') {
      if (eventType === 'INSERT') this.insertEventChannel(payload);
      if (eventType === 'UPDATE') this.insertEventChannel(payload);
    }
    if (table === 'channel_members') {
      if (eventType === 'INSERT') this.insertEventMember(payload);
      if (eventType === 'DELETE') this.deleteEventMembers(payload);
    }
  }

  private insertEventChannel(payload: RealtimePostgresChangesPayload<object>): void {
    console.log('CHANNELS INSERT', payload);
  }

  private updateEventChannel(payload: RealtimePostgresChangesPayload<object>): void {
    console.log('CHANNELS UPDATE', payload);
  }

  private insertEventMember(payload: RealtimePostgresChangesPayload<object>): void {
    console.log('MEMBERS INSERT', payload);
  }

  private deleteEventMembers(payload: RealtimePostgresChangesPayload<object>): void {
    console.log('MEMBERS DELETE', payload);
  }

  public ngOnDestroy(): void {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  public async getChannelIds(userId: string): Promise<void> {
    const { data }: PostgrestSingleResponse<ChannelId[] | []> = await this.supabase
      .from('channel_members')
      .select('channel_id, channels(name)')
      .eq('user_id', userId);
    if (data && data.length > 0) {
      const channels: ChannelIdAndName[] = data.map((channel: ChannelId): ChannelIdAndName => {
        const channelName: { name: string } = channel['channels'] as { name: string };
        return { id: channel['channel_id'], name: channelName['name'] };
      });
      this._channels.set(channels);
    }
  }

  public async getChannelData(channelId: string): Promise<void> {
    const { data } = await this.supabase
      .from('channels')
      .select('id, name, description, created_by, channel_members(user_id)')
      .eq('id', channelId);

    if (data && data.length > 0) {
      this._channel.set(data[0]);
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

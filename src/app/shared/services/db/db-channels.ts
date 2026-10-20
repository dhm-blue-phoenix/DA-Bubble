import { inject, Injectable, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  SupabaseClient,
  PostgrestSingleResponse,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import {
  ChannelId,
  SignalChannels,
  SignalChannel,
  ChannelIdAndName,
  Channel,
  ChannelMember,
} from '../../interfaces/db/db-channels';
import { DbPostgrestError } from '../../interfaces/db-error';
import { DatabaseAuth } from './db-auth';

@Injectable({
  providedIn: 'root',
})
export class DatabaseChannels {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly db_auth: DatabaseAuth = inject(DatabaseAuth);
  private readonly channels?: RealtimeChannel;

  /** Signal containing all channels (IDs and names) for the current user. */
  public readonly _channels: WritableSignal<SignalChannels> = signal<SignalChannels>([]);

  /** Signal containing details for the currently open channel. */
  public readonly _channel: WritableSignal<SignalChannel> = signal<SignalChannel>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.channels = this.subscribeChannels();
    }
  }

  /**
   * Subscribes to Realtime events for channels and their members.
   * @returns {RealtimeChannel} The subscribed Realtime channel.
   */
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

  /**
   * Routes incoming Realtime events to the relevant insert, update, or delete handlers.
   * @param {RealtimePostgresChangesPayload<object>} payload - The Supabase event payload.
   */
  private handleChannelsEvent(payload: RealtimePostgresChangesPayload<object>): void {
    const { table, eventType }: { table: string; eventType: string } = payload;
    if (table === 'channels') {
      if (eventType === 'INSERT') this.insertEventChannel(payload);
      if (eventType === 'UPDATE') this.updateEventChannel(payload);
    }
    if (table === 'channel_members') {
      if (eventType === 'INSERT') this.insertEventMember(payload);
      if (eventType === 'DELETE') this.deleteEventMembers(payload);
    }
  }

  /**
   * Handles a channel INSERT event and updates the `_channel` signal when applicable.
   * @param {RealtimePostgresChangesPayload<object>} payload - The event payload.
   */
  private insertEventChannel(payload: RealtimePostgresChangesPayload<object>): void {
    const channel = payload.new as Channel;
    const currentChannel: SignalChannel = this._channel();
    if (currentChannel !== null && currentChannel.id === channel.id) {
      this._channel.set({ ...currentChannel, ...channel });
    }
  }

  /**
   * Handles a channel UPDATE event and updates both `_channel` and `_channels`.
   * @param {RealtimePostgresChangesPayload<object>} payload - The event payload.
   */
  private updateEventChannel(payload: RealtimePostgresChangesPayload<object>): void {
    const channel = payload.new as Channel;
    const currentChannel: SignalChannel = this._channel();
    if (currentChannel !== null && currentChannel.id === channel.id) {
      this._channel.set({ ...currentChannel, ...channel });
    }
    this._channels.update((channels: SignalChannels): ChannelIdAndName[] =>
      channels.map(
        (c: ChannelIdAndName): ChannelIdAndName =>
          c.id === channel.id ? { ...c, name: channel.name } : c,
      ),
    );
  }

  /**
   * Handles a channel member INSERT event and updates the `_channel` signal.
   * @param {RealtimePostgresChangesPayload<object>} payload - The event payload.
   */
  private insertEventMember(payload: RealtimePostgresChangesPayload<object>): void {
    const member = payload.new as ChannelMember;
    const currentChannel: SignalChannel = this._channel();
    const currentUserId: string = this.db_auth.getCurrentUserId();
    if (currentUserId === member['user_id']) {
      this.getChannelIds(member['user_id'])
    }
    if (currentChannel !== null && currentChannel.id === member.channel_id) {
      const members: { user_id: string }[] = currentChannel.channel_members || [];
      if (!members.some((m: { user_id: string }): boolean => m.user_id === member.user_id)) {
        this._channel.set({
          ...currentChannel,
          channel_members: [...members, { user_id: member.user_id }],
        });
      }
    }
  }

  /**
   * Handles a channel member DELETE event and updates the `_channel` signal.
   * Also deletes the channel if it has no members left.
   * @param {RealtimePostgresChangesPayload<object>} payload - The event payload.
   */
  private deleteEventMembers(payload: RealtimePostgresChangesPayload<object>): void {
    const member = payload.old as Partial<ChannelMember>;
    const currentChannel: SignalChannel = this._channel();
    if (currentChannel !== null && currentChannel.id === member.channel_id) {
      this._channel.set({
        ...currentChannel,
        channel_members: (currentChannel.channel_members || []).filter(
          (m: { user_id: string }): boolean => m.user_id !== member.user_id,
        ),
      });
      const membersLength: number = currentChannel['channel_members'].length - 1;
      if (membersLength === 0) this.deleteChannel(member['channel_id']);
    }
  }

  /** Closes the Realtime connection when the service is destroyed. */
  public ngOnDestroy(): void {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  /**
   * Loads the IDs and names of all channels a user belongs to.
   * @param {string} userId - The user ID.
   * @returns {Promise<void>}
   */
  public async getChannelIds(userId: string): Promise<void> {
    const { data, error }: PostgrestSingleResponse<ChannelId[] | []> = await this.supabase
      .from('channel_members')
      .select('channel_id, channels(name)')
      .eq('user_id', userId);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    if (data && data.length > 0) {
      const channels: ChannelIdAndName[] = data.map((channel: ChannelId): ChannelIdAndName => {
        const channelName: { name: string } = channel['channels'] as { name: string };
        return { id: channel['channel_id'], name: channelName['name'] };
      });
      this._channels.set(channels);
    }
  }

  /**
   * Loads detailed data, including members, for a specific channel.
   * @param {string} channelId - The channel ID.
   * @returns {Promise<void>}
   */
  public async getChannelData(channelId: string): Promise<void> {
    const { data, error }: PostgrestSingleResponse<any> = await this.supabase
      .from('channels')
      .select('id, name, description, created_by, created_at, channel_members(user_id)')
      .eq('id', channelId);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    if (data && data.length > 0) {
      this._channel.set(data[0]);
    }
  }

  /**
   * Creates a channel in the database and adds its creator as an 'admin'.
   * @param {string} userId - The ID of the user creating the channel.
   * @param {string} name - The name of the new channel.
   * @param {string} description - The channel description.
   * @returns {Promise<boolean>} - Returns false if a duplicate exists; otherwise, true.
   */
  public async createNewChannel(
    userId: string,
    name: string,
    description: string,
  ): Promise<boolean> {
    if (await this.checkDuplicateChannelName(name)) return false;
    const { data, error }: PostgrestSingleResponse<{ id: string }[]> = await this.supabase
      .from('channels')
      .insert({
        name: name,
        description: description,
        created_by: userId,
      })
      .select();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    if (data && data.length > 0) await this.createNewMember(data[0]['id'], userId, 'admin');
    return true;
  }

  /**
   * Checks whether a channel with the same name already exists.
   * @param {string} name - The channel name to check.
   * @returns {Promise<boolean>} True if the name exists; otherwise, false.
   */
  private async checkDuplicateChannelName(name: string): Promise<boolean> {
    const { data, error }: PostgrestSingleResponse<Object[]> = await this.supabase
      .from('channels')
      .select('name')
      .eq('name', name);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    return !!(data && data.length > 0);
  }

  /**
   * Adds a new member to a channel.
   * @param {string} channelId - The channel ID.
   * @param {string} userId - The user ID.
   * @param {'admin' | 'member'} role - The user's role in the channel.
   * @returns {Promise<void>}
   */
  public async createNewMember(
    channelId: string,
    userId: string,
    role: 'admin' | 'member',
  ): Promise<void> {
    const { error }: DbPostgrestError = await this.supabase
      .from('channel_members')
      .insert({
        channel_id: channelId,
        user_id: userId,
        role: role,
      })
      .select();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Removes a member from a channel.
   * @param {string} channelId - The channel ID.
   * @param {string} userId - The user ID.
   * @returns {Promise<void>}
   */
  public async removeMember(channelId: string, userId: string): Promise<void> {
    const { error }: DbPostgrestError = await this.supabase
      .from('channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', userId);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Updates a channel's name and description.
   * @param {string} channelId - The channel ID.
   * @param {string} name - The new name.
   * @param {string} description - The new description.
   * @returns {Promise<void>}
   */
  public async updateChannelData(
    channelId: string,
    name: string,
    description: string,
  ): Promise<void> {
    const { error }: DbPostgrestError = await this.supabase
      .from('channels')
      .update({
        name: name,
        description: description,
        edited_at: new Date().toISOString(),
      })
      .eq('id', channelId)
      .select();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Deletes a channel.
   * @param {string} channelId - The channel ID.
   * @param {string} name - The new name.
   * @returns {Promise<void>}
   */
  private async deleteChannel(channelId: string): Promise<void> {
    const { error } = await this.supabase.from('channels').delete().eq('id', channelId);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }
}

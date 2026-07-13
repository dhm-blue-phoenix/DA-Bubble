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
  ReturnFromCreateNewChannel,
  SignalChannels,
  SignalChannel,
  ChannelIdAndName,
  Channel,
  ChannelMember,
} from '../../interfaces/db/db-channels';

@Injectable({
  providedIn: 'root',
})
export class DatabaseChannels {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly channels?: RealtimeChannel;

  /** Signal, das alle Kanäle (IDs und Namen) des aktuellen Benutzers hält. */
  public readonly _channels: WritableSignal<SignalChannels> = signal<SignalChannels>([]);

  /** Signal, das die Detaildaten des aktuell geöffneten Kanals hält. */
  public readonly _channel: WritableSignal<SignalChannel> = signal<SignalChannel>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.channels = this.subscribeChannels();
    }
  }

  /**
   * Abonniert Realtime-Events für die Kanäle und deren Mitglieder.
   * @returns {RealtimeChannel} Der abonnierte Realtime-Kanal.
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
   * Verteilt einkommende Realtime-Events an die zuständigen Insert/Update/Delete Funktionen.
   * @param {RealtimePostgresChangesPayload<object>} payload - Das Event-Payload von Supabase.
   */
  private handleChannelsEvent(payload: RealtimePostgresChangesPayload<object>): void {
    const { table, eventType }: { table: string, eventType: string} = payload;
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
   * Behandelt ein INSERT-Event für einen Kanal und aktualisiert das _channel Signal, falls zutreffend.
   * @param {RealtimePostgresChangesPayload<object>} payload - Das Event-Payload.
   */
  private insertEventChannel(payload: RealtimePostgresChangesPayload<object>): void {
    const channel = payload.new as Channel;
    const currentChannel: SignalChannel = this._channel();
    if (currentChannel !== null && currentChannel.id === channel.id) {
      this._channel.set({ ...currentChannel, ...channel });
    }
  }

  /**
   * Behandelt ein UPDATE-Event für einen Kanal und aktualisiert sowohl _channel als auch _channels.
   * @param {RealtimePostgresChangesPayload<object>} payload - Das Event-Payload.
   */
  private updateEventChannel(payload: RealtimePostgresChangesPayload<object>): void {
    const channel = payload.new as Channel;
    const currentChannel: SignalChannel = this._channel();
    if (currentChannel !== null && currentChannel.id === channel.id) {
      this._channel.set({ ...currentChannel, ...channel });
    }
    this._channels.update((channels: SignalChannels): ChannelIdAndName[] =>
      channels.map((c: ChannelIdAndName): ChannelIdAndName => (c.id === channel.id ? { ...c, name: channel.name } : c))
    );
  }

  /**
   * Behandelt ein INSERT-Event für Kanal-Mitglieder und aktualisiert das _channel Signal.
   * @param {RealtimePostgresChangesPayload<object>} payload - Das Event-Payload.
   */
  private insertEventMember(payload: RealtimePostgresChangesPayload<object>): void {
    const member = payload.new as ChannelMember;
    const currentChannel: SignalChannel = this._channel();
    if (currentChannel !== null && currentChannel.id === member.channel_id) {
      const members: { user_id: string }[] = currentChannel.channel_members || [];
      if (!members.some((m: { user_id: string }): boolean => m.user_id === member.user_id)) {
        this._channel.set({
          ...currentChannel,
          channel_members: [...members, { user_id: member.user_id }]
        });
      }
    }
  }

  /**
   * Behandelt ein DELETE-Event für Kanal-Mitglieder und aktualisiert das _channel Signal.
   * @param {RealtimePostgresChangesPayload<object>} payload - Das Event-Payload.
   */
  private deleteEventMembers(payload: RealtimePostgresChangesPayload<object>): void {
    const member = payload.old as Partial<ChannelMember>;
    const currentChannel: SignalChannel = this._channel();
    if (currentChannel !== null && currentChannel.id === member.channel_id) {
      this._channel.set({
        ...currentChannel,
        channel_members: (currentChannel.channel_members || []).filter((m: { user_id: string }) => m.user_id !== member.user_id)
      });
    }
  }

  /** Beendet die Realtime-Verbindung beim Zerstören des Services. */
  public ngOnDestroy(): void {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  /**
   * Lädt alle IDs und Namen der Kanäle, in denen ein bestimmter Benutzer Mitglied ist.
   * @param {string} userId - Die ID des Benutzers.
   * @returns {Promise<void>}
   */
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

  /**
   * Lädt detaillierte Daten (inkl. Mitgliedern) eines spezifischen Kanals.
   * @param {string} channelId - Die ID des Kanals.
   * @returns {Promise<void>}
   */
  public async getChannelData(channelId: string): Promise<void> {
    const { data } = await this.supabase
      .from('channels')
      .select('id, name, description, created_at, channel_members(user_id)')
      .eq('id', channelId);
    if (data && data.length > 0) {
      this._channel.set(data[0]);
    }
  }

  /**
   * Erstellt einen neuen Kanal in der Datenbank und fügt den Ersteller als 'admin' hinzu.
   * @param {string} userId - Die ID des erstellenden Benutzers.
   * @param {string} name - Der Name des neuen Kanals.
   * @param {string} description - Die Beschreibung des Kanals.
   * @returns {Promise<ReturnFromCreateNewChannel>} void im Erfolgsfall, ansonsten ein Objekt mit Fehlermeldung.
   */
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

  /**
   * Prüft, ob ein Kanal mit dem gleichen Namen bereits existiert.
   * @param {string} name - Der zu prüfende Kanal-Name.
   * @returns {Promise<boolean>} True, wenn der Name existiert, sonst false.
   */
  private async checkDuplicateCannelName(name: string): Promise<boolean> {
    const { data }: PostgrestSingleResponse<Object[]> = await this.supabase
      .from('channels')
      .select('name')
      .eq('name', name);
    return !!(data && data.length > 0);
  }

  /**
   * Fügt ein neues Mitglied zu einem Kanal hinzu.
   * @param {string} channelId - Die ID des Kanals.
   * @param {string} userId - Die ID des Benutzers.
   * @param {'admin' | 'member'} role - Die Rolle des Benutzers im Kanal.
   * @returns {Promise<void>}
   */
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

  /**
   * Entfernt ein Mitglied aus einem Kanal.
   * @param {string} channelId - Die ID des Kanals.
   * @param {string} userId - Die ID des Benutzers.
   * @returns {Promise<void>}
   */
  public async removeMember(channelId: string, userId: string): Promise<void> {
    await this.supabase
      .from('channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', userId);
  }

  /**
   * Aktualisiert den Namen und die Beschreibung eines Kanals.
   * @param {string} channelId - Die ID des Kanals.
   * @param {string} name - Der neue Name.
   * @param {string} description - Die neue Beschreibung.
   * @returns {Promise<void>}
   */
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

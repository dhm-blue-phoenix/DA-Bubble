import { inject, Injectable, OnDestroy, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import { DatabaseProfilesHelper } from './db-profiles-helper';

import { Profile, Profiles } from '../../interfaces/profile';
import { SupabaseResponseProfiles } from '../../interfaces/db/db-profiles';
import { DbPostgrestError } from '../../interfaces/db-error';

@Injectable({
  providedIn: 'root',
})
export class DatabaseProfiles implements OnDestroy {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly db_profile_helper: DatabaseProfilesHelper = inject(DatabaseProfilesHelper);
  private readonly channels?: RealtimeChannel;

  /** Signal containing the list of user profiles. */
  public readonly _profiles: WritableSignal<Profiles> = signal<Profiles>([]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.channels = this.subscribeProfiles();
    }
  }

  /**
   * Subscribes to Realtime updates for the profiles table.
   * @returns {RealtimeChannel} The subscribed Supabase Realtime channel.
   */
  private subscribeProfiles(): RealtimeChannel {
    return this.supabase
      .channel('realtime:profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload: RealtimePostgresChangesPayload<object>): void => this.handleProfileEvent(payload),
      )
      .subscribe(async (status: string): Promise<void> => {
        await this.db_profile_helper.subscribeHelper(status);
      });
  }

  /**
   * Processes incoming Realtime events for profiles.
   * @param {any} payload - The event object sent by Supabase.
   */
  private handleProfileEvent(payload: RealtimePostgresChangesPayload<object>): void {
    if (payload.eventType === 'INSERT') this.insertProfile(payload);
    if (payload.eventType === 'UPDATE') this.updateProfile(payload);
  }

  /** Closes the Realtime connection when the service is destroyed. */
  public ngOnDestroy(): void {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  /**
   * Adds a new profile to the local signal in response to a Realtime event.
   * @param {any} payload - The event object containing the new profile data.
   */
  private insertProfile(payload: RealtimePostgresChangesPayload<object>): void {
    const profile = payload.new as Profile;
    this._profiles.update(
      (list: Profiles): Profiles =>
        list.some((p: Profile): boolean => p.id === profile.id) ? list : [...list, profile],
    );
  }

  /**
   * Updates an existing profile in the local signal in response to a Realtime event.
   * @param {any} payload - The event object containing the updated profile data.
   */
  private updateProfile(payload: RealtimePostgresChangesPayload<object>): void {
    const profile = payload.new as Profile;
    this._profiles.update(
      (list: Profiles): Profiles =>
        list.map((p: Profile): Profile => (p.id === profile.id ? profile : p)),
    );
  }

  /**
   * Loads all user profiles from the database and updates the signal.
   * @returns {Promise<void>}
   */
  public async getProfiles(): Promise<void> {
    const { data: profiles, error }: SupabaseResponseProfiles = await this.supabase
      .from('profiles')
      .select('id, name, email, avatar, status, created_at');
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    if (profiles) this._profiles.set(profiles);
  }

  /**
   * Loads a specific profile from the database.
   * @param {string} profileId - The ID of the profile to load.
   * @returns {Promise<Profile | null>} A promise containing the profile data or null.
   */
  public async getProfile(profileId: string): Promise<Profile | null> {
    const { data: profiles, error }: SupabaseResponseProfiles = await this.supabase
      .from('profiles')
      .select('id, name, email, avatar, status, created_at')
      .eq('id', profileId);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    return profiles && profiles.length > 0 ? profiles[0] : null;
  }

  /**
   * Updates a profile's display name.
   * @param {string} profileId - The profile ID.
   * @param {string} value - The new name.
   * @returns {Promise<void>}
   */
  public async updateProfileName(profileId: string, value: string): Promise<void> {
    const { error }: DbPostgrestError = await this.supabase
      .from('profiles')
      .update({ name: value })
      .eq('id', profileId)
      .select();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Updates a profile's avatar.
   * @param {string} profileId - The profile ID.
   * @param {string} value - The new avatar.
   * @returns {Promise<void>}
   */
  public async updateProfileAvatar(profileId: string, value: string): Promise<void> {
    const { error }: DbPostgrestError = await this.supabase
      .from('profiles')
      .update({ avatar: value })
      .eq('id', profileId)
      .select();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }
}

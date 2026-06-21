import { Injectable, signal, WritableSignal, PLATFORM_ID, inject, Signal, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environment/environment';

import { DatabaseAuth } from './db-auth';

import {
  createClient,
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  SupabaseClient,
  PostgrestError
} from '@supabase/supabase-js';

import { Profile, Profiles } from '../../interfaces/profile';

type SupabaseResponseProfiles = { data: Profiles | null; error: PostgrestError | null; };

@Injectable({
  providedIn: 'root'
})
export class DatabaseProfiles implements OnDestroy {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly debug_logs: boolean = environment.debug_logs;
  private readonly supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);
  private readonly db_auth: DatabaseAuth = inject(DatabaseAuth);

  private insertChannelProfiles!: RealtimeChannel;
  private updateChannelProfiles!: RealtimeChannel;

  public readonly _profiles: WritableSignal<Profiles> = signal<Profiles>([]);
  public readonly profiles: Signal<Profiles> = this._profiles.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.getProfiles();
      this.insertChannelProfiles = this.subscribeInsertChannelProfiles();
      this.updateChannelProfiles = this.subscribeUpdateChannelProfiles();
    }

    if (this.debug_logs) {
      this.debugging();
    }
  }

  public ngOnDestroy(): void {
    if (this.insertChannelProfiles) {
      this.supabase.removeChannel(this.insertChannelProfiles);
    }
    if (this.updateChannelProfiles) {
      this.supabase.removeChannel(this.updateChannelProfiles);
    }
  }

  private subscribeInsertChannelProfiles(): RealtimeChannel {
    return this.supabase
      .channel('custom-insert-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload: RealtimePostgresInsertPayload<any>): void => {
          const newProfile = payload['new'] as Profile;
          this._profiles.update((list: Profiles): Profiles => {
            if (list.some((p: Profile): boolean => p.id === newProfile.id)) {
              return list;
            }
            return [...list, newProfile];
          });
        }
      )
      .subscribe();
  }

  private subscribeUpdateChannelProfiles(): RealtimeChannel {
    return this.supabase
      .channel('custom-update-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload: RealtimePostgresUpdatePayload<any>): void => {
          this._profiles.update(
            (list: Profiles): Profiles =>
              list.map(
                (profile: Profile): Profile =>
                  profile.id === payload.old['id'] ? (payload.new as Profile) : profile
              )
          );
        }
      )
      .subscribe();
  }

  private async debugging(): Promise<void> {
    //console.log(await this.getProfile('18290dd9-9a3a-4f0b-b74b-fa36e5b38ecd'));
    //this.updateProfileName(this.getLocalStorageCurrentProfileId(), 'Richert Stark');
  }

  private async getProfiles(): Promise<void> {
    if (this.db_auth.isUserLogin()) {
      const { data: profiles, error }: SupabaseResponseProfiles = await this.supabase
        .from('profiles')
        .select('id, name, email, avatar_url, status, created_at');

      if (this.debug_logs) {
        if (error) console.error('getProfiles_error', error);
        console.log('profiles', profiles);
      }

      if (profiles) this._profiles.set(profiles);
    }
  }

  public async getProfile(profileId: string): Promise<Profile | null> {
    if (this.db_auth.isUserLogin()) {
      const { data: profiles, error }: SupabaseResponseProfiles = await this.supabase
        .from('profiles')
        .select('id, name, email, avatar_url, status, created_at')
        .eq('id', profileId);

      if (this.debug_logs) {
        if (error) console.error('getProfile_error', error);
        console.log('profiles', profiles);
      }

      return profiles ? profiles[0] : null;
    }
    return null;
  }

  public async updateProfileName(profileId: string, value: string): Promise<void> {
    if (profileId.length > 5 && value.length > 1) {
      const { data, error }: SupabaseResponseProfiles = await this.supabase
        .from('profiles')
        .update({ name: value })
        .eq('id', profileId)
        .select();
    }
  }
}

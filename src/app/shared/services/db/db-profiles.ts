import { Injectable, signal, WritableSignal, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environment/environment';

import { RealtimeChannel, SupabaseClient, PostgrestError } from '@supabase/supabase-js';

import { Profile, Profiles } from '../../interfaces/profile';
import { Supabase } from './db-superbase';

type SupabaseResponseProfiles = { data: Profiles | null; error: PostgrestError | null };

@Injectable({
  providedIn: 'root',
})
export class DatabaseProfiles implements OnDestroy {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly debug_logs: boolean = environment.debug_logs;
  private readonly supabase: SupabaseClient = inject(Supabase).supabase;
  private readonly channels?: RealtimeChannel;

  public readonly _profiles: WritableSignal<Profiles> = signal<Profiles>([]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.channels = this.subscribeProfiles();
    }

    if (this.debug_logs) {
      this.debugging();
    }
  }

  private subscribeProfiles(): RealtimeChannel {
    return this.supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) =>
        this.handleProfileEvent(payload),
      )
      .subscribe();
  }

  private handleProfileEvent(payload: any): void {
    if (payload.eventType === 'INSERT') this.insertProfile(payload);
    if (payload.eventType === 'UPDATE') this.updateProfile(payload);
  }

  public ngOnDestroy(): void {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  private insertProfile(payload: any): void {
    const profile = payload.new as Profile;

    this._profiles.update(
      (list: Profiles): Profiles =>
        list.some((p: Profile): boolean => p.id === profile.id) ? list : [...list, profile],
    );
  }

  private updateProfile(payload: any): void {
    const profile = payload.new as Profile;

    this._profiles.update(
      (list: Profiles): Profiles =>
        list.map((p: Profile): Profile => (p.id === profile.id ? profile : p)),
    );
  }

  private async debugging(): Promise<void> {
    //console.warn(await this.getProfile('18290dd9-9a3a-4f0b-b74b-fa36e5b38ecd'));
    //this.updateProfileName(this.getLocalStorageCurrentProfileId(), 'Richert Stark');
  }

  public async getProfiles(): Promise<void> {
    const { data: profiles, error }: SupabaseResponseProfiles = await this.supabase
      .from('profiles')
      .select('id, name, email, avatar_url, status, created_at');

    if (this.debug_logs) {
      if (error) console.error('getProfiles_error', error);
      console.log('profiles', profiles);
    }

    if (profiles) this._profiles.set(profiles);
  }

  public async getProfile(profileId: string): Promise<Profile | null> {
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

import { Injectable, signal, WritableSignal, PLATFORM_ID, inject } from '@angular/core';
import { environment } from '../../../../environment/environment';

import {
  createClient,
  PostgrestResponse,
  RealtimeChannel, RealtimePostgresInsertPayload, RealtimePostgresUpdatePayload,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';

import { Profile, Profiles, emptyProfile } from '../../interfaces/profile';

@Injectable({
  providedIn: 'root',
})
export class DatabaseProfils {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly debug_logs: boolean = environment.debug_logs;
  private readonly supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
  );

  private insertChannelProfiles: RealtimeChannel;
  private updateChannelProfiles: RealtimeChannel;

  public profiles: WritableSignal<Profiles> = signal<Profiles>([emptyProfile]);

  constructor() {
    this.insertChannelProfiles = this.subscribeInsertChannelProfiles();
    this.updateChannelProfiles = this.subscribeUpdateChannelProfiles();

    if (this.debug_logs) {
      this.debuging();
    }
  }

  private ngOnDestroy(): void {
    this.supabase.removeChannel(this.insertChannelProfiles);
    this.supabase.removeChannel(this.updateChannelProfiles);
  }

  private subscribeInsertChannelProfiles(): RealtimeChannel {
    return this.supabase
      .channel('custom-insert-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload: RealtimePostgresInsertPayload<any>): void => {
          console.log('Change received!', payload);
          this.profiles.update((list: Profiles): Profiles => {
            return [...list, payload['new'] as Profile];
          });
        },
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
          this.profiles.update(
            (list: Profiles): Profiles =>
              list.map(
                (profile: Profile): Profile =>
                  profile.id === payload.old['id'] ? (payload.new as Profile) : profile,
              ),
          );
        },
      )
      .subscribe();
  }

  private async debuging(): Promise<void> {
    //console.log('environment', environment);
    //await this.signUpNewUser(environment.debug_user_email, environment.debug_user_password, environment.debug_user_name);
    //await this.signUpNewUser(environment.debug_user2_email, environment.debug_user2_password, environment.debug_user2_name);
    //await this.signInWithEmail(environment.debug_user_email, environment.debug_user_password);
    //await this.signOut();
    //console.log(await this.getProfile('18290dd9-9a3a-4f0b-b74b-fa36e5b38ecd'));
  }

  private setLocalStorageCurrentProfileId(value: string): void {
    if (this.platformId === 'browser' && value.length > 10) {
      localStorage.setItem('currentProfileId', value);
    }
  }

  private getLocalStorageCurrentProfileId(): string {
    const profileId: string | null = localStorage.getItem('currentProfileId');
    return profileId ? profileId : '';
  }

  private deleteLocalStorageCurrentProfileId(): void {
    localStorage.removeItem('currentProfileId');
  }

  private setStatus(): void {}

  private async updateProfileStatus(): Promise<void> {}

  public async signUpNewUser(
    user_email: string,
    user_password: string,
    user_name: string,
  ): Promise<void> {
    if (user_email.length > 5 && user_password.length > 5 && user_name.length > 5) {
      const { data, error } = await this.supabase.auth.signUp({
        email: user_email,
        password: user_password,
        options: {
          data: { name: user_name },
        },
      });
      if (this.debug_logs) {
        if (error) console.error('signUpNewUser_error', error);
        console.log('signUpNewUser_data', data);
      }
    }
  }

  public async signInWithEmail(user_email: string, user_password: string): Promise<void> {
    if (user_email.length > 5  && user_password.length > 5) {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: user_email,
        password: user_password,
      });
      if (this.debug_logs) {
        if (error) console.error('signInWithEmail_error', error);
        console.log('signInWithEmail_data', data);
      }
      const userData: User | null = data['user'];
      if (userData) {
        this.setLocalStorageCurrentProfileId(userData['id']);
      }
    }
  }

  public async resetPasswordForEmail() {
    console.warn('Ist noch in der entwicklung');
  }

  public async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (this.debug_logs && error) {
      console.error('signOut_error', error);
    }
    this.deleteLocalStorageCurrentProfileId();
  }

  public async getProfile(userId: string): Promise<Profile> {
    const { data: profiles, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);

    if (this.debug_logs) {
      if (error) console.error('getProfile_error', error);
      console.log('profiles', profiles);
    }

    return profiles ? profiles[0] : emptyProfile;
  }

  public async getProfiles(): Promise<void> {
    const { data: profiles, error } = await this.supabase.from('profiles').select('*');

    if (this.debug_logs) {
      if (error) console.error('getProfiles_error', error);
      console.log('profiles', profiles);
    }

    if (profiles) this.profiles.set(profiles);
  }

  public async updateProfileName(): Promise<void> {}
}

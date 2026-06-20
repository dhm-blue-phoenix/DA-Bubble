import { Injectable, signal, WritableSignal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environment/environment';

import {
  AuthChangeEvent,
  createClient,
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';

import { Profile, Profiles } from '../../interfaces/profile';
import { emptyProfile } from '../../models/profile';

@Injectable({
  providedIn: 'root',
})
export class DatabaseProfiles {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly debug_logs: boolean = environment.debug_logs;
  private readonly supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
  );

  private insertChannelProfiles?: RealtimeChannel;
  private updateChannelProfiles?: RealtimeChannel;

  public readonly profiles: WritableSignal<Profiles> = signal<Profiles>([]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.getProfiles();
      this.setupAuthListener();
      this.insertChannelProfiles = this.subscribeInsertChannelProfiles();
      this.updateChannelProfiles = this.subscribeUpdateChannelProfiles();
    }

    if (this.debug_logs) {
      this.debuging();
    }
  }

  private ngOnDestroy(): void {
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
    //this.updateProfileName(this.getLocalStorageCurrentProfileId(), 'Richert Stark');
  }

  private setupAuthListener(): void {
    this.supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null): void => {
        if (this.debug_logs) {
          console.log('Auth state change:', event, session);
        }
        const userData = session?.user;
        if (userData) {
          this.setLocalStorageCurrentProfileId(userData.id);
          this.setStatus('online');
        } else {
          this.setStatus('offline');
          this.deleteLocalStorageCurrentProfileId();
        }
      },
    );
  }

  private setLocalStorageCurrentProfileId(value: string): void {
    if (isPlatformBrowser(this.platformId) && value.length > 10) {
      localStorage.setItem('currentProfileId', value);
    }
  }

  private getLocalStorageCurrentProfileId(): string {
    if (isPlatformBrowser(this.platformId)) {
      const profileId: string | null = localStorage.getItem('currentProfileId');
      return profileId ? profileId : '';
    }
    return '';
  }

  private deleteLocalStorageCurrentProfileId(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentProfileId');
    }
  }

  private async setStatus(status: 'offline' | 'online' | 'away'): Promise<void> {
    const profileId: string = this.getLocalStorageCurrentProfileId();
    if (profileId) {
      const profile: Profile = await this.getProfile(profileId);

      if (profile['status'] !== status) {
        console.log(status);
        await this.updateProfileStatus(profileId, status);
      }
    }
  }

  private async updateProfileStatus(
    profileId: string,
    value: 'offline' | 'online' | 'away',
  ): Promise<void> {
    if (profileId.length > 5 && value.length > 1) {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({ status: value })
        .eq('id', profileId)
        .select();
    }
  }

  private async getProfiles(): Promise<void> {
    const { data: profiles, error } = await this.supabase.from('profiles').select('*');

    if (this.debug_logs) {
      if (error) console.error('getProfiles_error', error);
      console.log('profiles', profiles);
    }

    if (profiles) this.profiles.set(profiles);
  }

  // Funktion signUpNewUser error handlieng überarbeiten
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
      this.setStatus('online');
    }
  }

  // Funktion signInWithEmail error handlieng überarbeiten
  public async signInWithEmail(user_email: string, user_password: string): Promise<void> {
    if (user_email.length > 5 && user_password.length > 5) {
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
        this.setStatus('online');
      }
    }
  }

  // Funktion resetPasswordForEmail Muss noch geschrieben werden!
  public async resetPasswordForEmail(): Promise<void> {
    console.warn('Ist noch in der entwicklung');
  }

  public async signOut(): Promise<void> {
    await this.setStatus('offline');
    const { error } = await this.supabase.auth.signOut();
    if (this.debug_logs && error) {
      console.error('signOut_error', error);
    }
    this.profiles.set([]);
    this.deleteLocalStorageCurrentProfileId();
  }

  public async getProfile(profileId: string): Promise<Profile> {
    const { data: profiles, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId);

    if (this.debug_logs) {
      if (error) console.error('getProfile_error', error);
      console.log('profiles', profiles);
    }

    return profiles && profiles[0];
  }

  public async updateProfileName(profileId: string, value: string): Promise<void> {
    if (profileId.length > 5 && value.length > 1) {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({ name: value })
        .eq('id', profileId)
        .select();
    }
  }
}

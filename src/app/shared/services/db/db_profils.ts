import { Injectable, signal, WritableSignal, PLATFORM_ID, inject, Signal, OnDestroy } from '@angular/core';
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

  private insertChannelProfiles!: RealtimeChannel;
  private updateChannelProfiles!: RealtimeChannel;

  private readonly isUserLogin: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _profiles: WritableSignal<Profiles> = signal<Profiles>([]);
  public readonly profiles: Signal<Profiles> = this._profiles.asReadonly();

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

  private async debuging(): Promise<void> {
    //console.log('environment', environment);
    //await this.signUpNewUser(environment.debug_user_email, environment.debug_user_password, environment.debug_user_name);
    //await this.signUpNewUser(environment.debug_user2_email, environment.debug_user2_password, environment.debug_user2_name);
    //await this.signInWithEmail(environment.debug_user_email, environment.debug_user_password);
    //await this.signOut();
    //console.log(await this.getProfile('18290dd9-9a3a-4f0b-b74b-fa36e5b38ecd'));
    //this.updateProfileName(this.getLocalStorageCurrentProfileId(), 'Richert Stark');
    //console.log( await this.getAuthUser());
  }

  private setupAuthListener(): void {
    this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null): void => {
        if (this.debug_logs) {
          console.log('Auth state change:', event, session);
        }
        const userData: User | undefined = session?.user;
        if (userData) {
          this.setStatus('online');
          this.isUserLogin.set(true);
          console.warn('set status on');
        } else {
          this.setStatus('offline');
          this.isUserLogin.set(false);
          this._profiles.set([]);
          console.warn('set status off');
        }
      }
    );
  }

  private async setStatus(status: 'offline' | 'online'): Promise<void> {
    const profileId: string = await this.getAuthUser();
    if (profileId) {
      const profile: Profile | null = await this.getProfile(profileId);

      if (profile!['status'] !== status) {
        await this.updateProfileStatus(profileId, status);
      }
    }
  }

  private async getAuthUser(): Promise<string> {
    const { data: { user } }: { data: { user: User | null } } = await this.supabase.auth.getUser();
    return user?.id || '';
  }

  private async updateProfileStatus(profileId: string, value: 'offline' | 'online'): Promise<void> {
    if (profileId.length > 5 && value.length > 1) {
      const { data, error }: SupabaseResponseProfiles = await this.supabase
        .from('profiles')
        .update({ status: value })
        .eq('id', profileId)
        .select();
    }
  }

  private async getProfiles(): Promise<void> {
    if (this.isUserLogin()) {
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

  // Funktion signUpNewUser error handlieng überarbeiten
  public async signUpNewUser(user_email: string, user_password: string, user_name: string): Promise<void> {
    if (user_email.length > 5 && user_password.length > 5 && user_name.length > 5) {
      const { data, error } = await this.supabase.auth.signUp({
        email: user_email,
        password: user_password,
        options: {
          data: { name: user_name }
        }
      });
      if (this.debug_logs) {
        if (error) console.error('signUpNewUser_error', error);
        console.log('signUpNewUser_data', data);
      }
    }
  }

  // Funktion signInWithEmail error handlieng überarbeiten
  public async signInWithEmail(user_email: string, user_password: string): Promise<void> {
    if (user_email.length > 5 && user_password.length > 5) {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: user_email,
        password: user_password
      });
      if (this.debug_logs) {
        if (error) console.error('signInWithEmail_error', error);
        console.log('signInWithEmail_data', data);
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
  }

  public async getProfile(profileId: string): Promise<Profile | null> {
    if (this.isUserLogin()) {
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

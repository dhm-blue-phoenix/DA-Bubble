import { Injectable, signal, WritableSignal, PLATFORM_ID, inject, Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environment/environment';

import {
  AuthChangeEvent,
  createClient,
  Session,
  SupabaseClient,
  User,
  PostgrestError
} from '@supabase/supabase-js';

import { Profile, Profiles } from '../../interfaces/profile';
import { DatabaseProfiles } from './db-profiles';

type SupabaseResponseProfiles = { data: Profiles | null; error: PostgrestError | null; };

@Injectable({
  providedIn: 'root',
})
export class DatabaseAuth {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly debug_logs: boolean = environment.debug_logs;
  private readonly supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);
  private readonly db_profiles: DatabaseProfiles = inject(DatabaseProfiles);

  private readonly _isUserLogin: WritableSignal<boolean> = signal<boolean>(false);
  public readonly isUserLogin: Signal<boolean> = this._isUserLogin.asReadonly();

  constructor() {
    if(isPlatformBrowser(this.platformId)) {
      this.setupAuthListener();
    }

    if (this.debug_logs) {
      this.debugging();
    }
  }

  private async debugging(): Promise<void> {
    //console.log('environment', environment);
    //await this.signUpNewUser(environment.debug_user_email, environment.debug_user_password, environment.debug_user_name);
    //await this.signUpNewUser(environment.debug_user2_email, environment.debug_user2_password, environment.debug_user2_name);
    //await this.signInWithEmail(environment.debug_user_email, environment.debug_user_password);
    //await this.signOut();
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
          this._isUserLogin.set(true);
        } else {
          this.setStatus('offline');
          this._isUserLogin.set(false);
          this.db_profiles._profiles.set([]);
        }
      }
    );
  }

  private async getAuthUser(): Promise<string> {
    const { data: { user } }: { data: { user: User | null } } = await this.supabase.auth.getUser();
    return user?.id || '';
  }

  private async setStatus(status: 'offline' | 'online'): Promise<void> {
    const profileId: string = await this.getAuthUser();
    if (profileId) {
      const profile: Profile | null = await this.db_profiles.getProfile(profileId);

      if (profile!['status'] !== status) {
        await this.updateProfileStatus(profileId, status);
      }
    }
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
}

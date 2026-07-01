import { Injectable, signal, WritableSignal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environment/environment';
import { Supabase } from './db-superbase';

import {
  SupabaseClient,
  PostgrestError,
  AuthChangeEvent,
  Session
} from '@supabase/supabase-js';

import { Profiles } from '../../interfaces/profile';

type SupabaseResponseProfiles = { data: Profiles | null; error: PostgrestError | null; };

@Injectable({
  providedIn: 'root',
})
export class DatabaseAuth {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly debug_logs: boolean = environment.debug_logs;
  private readonly supabase: SupabaseClient = inject(Supabase).supabase;

  public readonly _isUserLogin: WritableSignal<boolean> = signal<boolean>(false);

  constructor() {
    if(isPlatformBrowser(this.platformId)) {
      //this.setupAuthListener();

      if (this.debug_logs) {
        this.debugging();
      }
    }
  }

  private async debugging(): Promise<void> {
    //console.log('environment', environment);
    //await this.signUpNewUser(environment.debug_user_email, environment.debug_user_password, environment.debug_user_name, 'dummydata');
    //await this.signUpNewUser(environment.debug_user2_email, environment.debug_user2_password, environment.debug_user2_name);
    //await this.signInWithEmail(environment.debug_user_email, environment.debug_user_password);
    //await this.signOut();
  }

  private async setUserOnline(userId: string): Promise<void> {
    await this.setStatus('online');
    this.setLocalStorageCurrentProfileId(userId);
    this._isUserLogin.set(true);
  }

  private async setUserOffline(): Promise<void> {
    await this.setStatus('offline');
    this.deleteLocalStorageCurrentProfileId();
    this._isUserLogin.set(false);
  }

  /*
  private setupAuthListener(): void {
    this.supabase.auth.onAuthStateChange( async (event: AuthChangeEvent, session: Session | null): Promise<void> => {
        if (this.debug_logs) {
          console.log('Auth state change:', event, session);
        }
        const userId: string | undefined = session?.user?.id;
        if (userId) await this.setUserOnline(userId); else await this.setUserOffline();
      },
    );
  }
  */

  private setLocalStorageCurrentProfileId(value: string): void {
    if (isPlatformBrowser(this.platformId) && value.length > 10) {
      localStorage.setItem('currentProfileId', value);
    }
  }

  public getLocalStorageCurrentProfileId(): string {
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

  private async setStatus(status: 'offline' | 'online'): Promise<void> {
    const profileId: string = this.getLocalStorageCurrentProfileId();
    if (profileId) {
      await this.updateProfileStatus(profileId, status);
    }
  }

  private async updateProfileStatus(profileId: string, value: 'offline' | 'online'): Promise<void> {
   console.log('updateProfileStatus', profileId, value);
    if (profileId.length > 5 && value.length > 1) {
      const { data, error }: SupabaseResponseProfiles = await this.supabase
        .from('profiles')
        .update({ status: value })
        .eq('id', profileId)
        .select();
    }
  }

  // Funktion signUpNewUser error handlieng überarbeiten
  public async signUpNewUser(user_email: string, user_password: string, user_name: string, user_avatar: string): Promise<void> {
    if (user_email.length > 5 && user_password.length > 5 && user_name.length > 5) {
      const { data, error } = await this.supabase.auth.signUp({
        email: user_email,
        password: user_password,
        options: {
          data: { name: user_name, avatar: user_avatar },
        },
      });
      if (this.debug_logs) {
        if (error) console.error('signUpNewUser_error', error);
        console.log('signUpNewUser_data', data);
      }
      if (data.user) {
        const userId: string = data.user.id;
        this.setUserOnline(userId);
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
      if (data.user) {
        const userId: string = data.user.id;
        this.setUserOnline(userId);
      }
    }
  }

  // Funktion resetPasswordForEmail Muss noch geschrieben werden!
  public async resetPasswordForEmail(): Promise<void> {
    console.warn('Ist noch in der entwicklung');
  }

  public async signOut(): Promise<void> {
    await this.setUserOffline();
    console.warn('Logout!!!')
    const { error } = await this.supabase.auth.signOut();
    if (this.debug_logs && error) {
      console.error('signOut_error', error);
    }
  }
}

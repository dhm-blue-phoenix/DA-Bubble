import { Injectable, signal, WritableSignal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environment/environment';
import { Supabase } from './db-superbase';

import {
  SupabaseClient,
  AuthChangeEvent,
  Session
} from '@supabase/supabase-js';

import { SupabaseResponseProfiles } from '../../interfaces/db/db-auth';

@Injectable({
  providedIn: 'root',
})
export class DatabaseAuth {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly debug_logs: boolean = environment.debug_logs;
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];

  /** Signal, das den aktuellen Anmeldestatus des Benutzers hält. */
  public readonly _isUserLogin: WritableSignal<boolean> = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      //this.setupAuthListener();

      if (this.debug_logs) {
        this.debugging();
      }
    }
  }

  /**
   * Interne Funktion für Debugging-Zwecke.
   */
  private async debugging(): Promise<void> {
    //console.log('environment', environment);
    //await this.signUpNewUser(environment.debug_user_email, environment.debug_user_password, environment.debug_user_name, 'dummydata');
    //await this.signUpNewUser(environment.debug_user2_email, environment.debug_user2_password, environment.debug_user2_name);
    //await this.signInWithEmail(environment.debug_user_email, environment.debug_user_password);
    //await this.signOut();
  }

  /**
   * Setzt den Benutzer-Status auf 'online', speichert die ID und setzt das Login-Signal.
   * @param {string} userId - Die ID des Benutzers.
   * @returns {Promise<void>}
   */
  private async setUserOnline(userId: string): Promise<void> {
    await this.setStatus('online');
    this.setLocalStorageCurrentProfileId(userId);
    this._isUserLogin.set(true);
  }

  /**
   * Setzt den Benutzer-Status auf 'offline', entfernt die ID und setzt das Login-Signal.
   * @returns {Promise<void>}
   */
  private async setUserOffline(): Promise<void> {
    await this.setStatus('offline');
    this.deleteLocalStorageCurrentProfileId();
    this._isUserLogin.set(false);
  }

  /**
   * Speichert die Profil-ID des aktuell angemeldeten Benutzers im LocalStorage.
   * @param {string} value - Die Profil-ID.
   */
  private setLocalStorageCurrentProfileId(value: string): void {
    if (isPlatformBrowser(this.platformId) && value.length > 10) {
      localStorage.setItem('currentProfileId', value);
    }
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

  /**
   * Holt die Profil-ID des aktuell angemeldeten Benutzers aus dem LocalStorage.
   * @returns {string} Die Profil-ID oder ein leerer String.
   */
  public getLocalStorageCurrentProfileId(): string {
    if (isPlatformBrowser(this.platformId)) {
      const profileId: string | null = localStorage.getItem('currentProfileId');
      return profileId ? profileId : '';
    }
    return '';
  }

  /**
   * Entfernt die Profil-ID des aktuell angemeldeten Benutzers aus dem LocalStorage.
   */
  private deleteLocalStorageCurrentProfileId(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentProfileId');
    }
  }

  /**
   * Aktualisiert den Online-Status des aktuellen Profils.
   * @param {'offline' | 'online'} status - Der neue Status.
   * @returns {Promise<void>}
   */
  private async setStatus(status: 'offline' | 'online'): Promise<void> {
    const profileId: string = this.getLocalStorageCurrentProfileId();
    if (profileId) {
      await this.updateProfileStatus(profileId, status);
    }
  }

  /**
   * Führt das Datenbank-Update für den Status eines bestimmten Profils aus.
   * @param {string} profileId - Die Profil-ID.
   * @param {'offline' | 'online'} value - Der neue Status.
   * @returns {Promise<void>}
   */
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

  /**
   * Registriert einen neuen Benutzer und loggt ihn bei Erfolg direkt ein.
   * @param {string} user_email - E-Mail Adresse.
   * @param {string} user_password - Passwort.
   * @param {string} user_name - Anzeigename.
   * @param {string} user_avatar - Avatar-URL oder -Name.
   * @returns {Promise<void>}
   */
  public async signUpNewUser(
    user_email: string,
    user_password: string,
    user_name: string,
    user_avatar: string,
  ): Promise<void> {
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

  /**
   * Meldet einen bestehenden Benutzer mit E-Mail und Passwort an.
   * @param {string} user_email - E-Mail Adresse.
   * @param {string} user_password - Passwort.
   * @returns {Promise<void>}
   */
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
      if (data.user) {
        const userId: string = data.user.id;
        this.setUserOnline(userId);
      }
    }
  }

  /**
   * Fordert eine E-Mail zum Zurücksetzen des Passworts an.
   * @param {string} email - Die E-Mail Adresse des Benutzers.
   * @returns {Promise<void>}
   */
  public async resetPasswordForEmail(email: string): Promise<void> {
    await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://example.com/account/update-password',
    });
  }

  /**
   * Ändert das Passwort des aktuell angemeldeten Benutzers.
   * @param {string} newPassword - Das neue Passwort.
   * @returns {Promise<void>}
   */
  public async changePassword(newPassword: string): Promise<void> {
    await this.supabase.auth.updateUser({ password: newPassword });
  }

  /**
   * Meldet den aktuellen Benutzer ab und setzt seinen Status auf 'offline'.
   * @returns {Promise<void>}
   */
  public async signOut(): Promise<void> {
    await this.setUserOffline();
    console.warn('Logout!!!');
    const { error } = await this.supabase.auth.signOut();
    if (this.debug_logs && error) {
      console.error('signOut_error', error);
    }
  }
}

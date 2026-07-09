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

  /** Speichert die Profil-ID des aktuell angemeldeten Benutzers */
  private currentUserId: string = '';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupAuthListener();
      this.setupWindowFocusListener();

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
   * Lauscht auf Änderungen des Authentifizierungsstatus durch Supabase.
   */
  private setupAuthListener(): void {
    this.supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null): Promise<void> => {
      if (this.debug_logs) {
        console.log('Auth state change:', event, session);
      }
      if (event === 'SIGNED_OUT') {
        this.currentUserId = '';
        this._isUserLogin.set(false);
      } else if (session?.user) {
        this.currentUserId = session.user.id;
        this._isUserLogin.set(true);
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          await this.setStatus('online');
        }
      }
    });
  }

  /**
   * Verfolgt den Fensterfokus, um den Status auf 'away' oder 'online' zu setzen.
   */
  private setupWindowFocusListener(): void {
    window.addEventListener('focus', async (): Promise<void> => {
      if (this.currentUserId) {
        await this.setStatus('online');
      }
    });
    window.addEventListener('blur', async (): Promise<void> => {
      if (this.currentUserId) {
        await this.setStatus('away');
      }
    });
  }

  /**
   * Gibt die Profil-ID des aktuell angemeldeten Benutzers zurück.
   * @returns {string} Die Profil-ID oder ein leerer String.
   */
  public getCurrentUserId(): string {
    return this.currentUserId;
  }

  /**
   * Aktualisiert den Online-Status des aktuellen Profils.
   * @param {'offline' | 'online' | 'away'} status - Der neue Status.
   * @returns {Promise<void>}
   */
  private async setStatus(status: 'offline' | 'online' | 'away'): Promise<void> {
    const profileId: string = this.getCurrentUserId();
    if (profileId) {
      await this.updateProfileStatus(profileId, status);
    }
  }

  /**
   * Führt das Datenbank-Update für den Status eines bestimmten Profils aus.
   * @param {string} profileId - Die Profil-ID.
   * @param {'offline' | 'online' | 'away'} value - Der neue Status.
   * @returns {Promise<void>}
   */
  private async updateProfileStatus(profileId: string, value: 'offline' | 'online' | 'away'): Promise<void> {
    if (this.debug_logs) console.log('updateProfileStatus', profileId, value);
    if (profileId.length > 5 && value.length > 1) {
      await this.supabase
        .from('profiles')
        .update({ status: value })
        .eq('id', profileId)
        .select();
    }
  }

  /**
   * Prüft, ob eine E-Mail-Adresse bereits registriert ist.
   * @param {string} email - Die zu prüfende E-Mail-Adresse.
   * @returns {Promise<boolean>} True, wenn die E-Mail existiert, sonst false.
   */
  public async checkEmailExists(email: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    return !!data;
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
      if (await this.checkEmailExists(user_email)) throw new Error('User email already exists');
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
    const userId: string = this.currentUserId;
    this.currentUserId = '';
    if (userId) await this.updateProfileStatus(userId, 'offline');
    if (this.debug_logs) console.warn('Logout!!!');
    const { error } = await this.supabase.auth.signOut();
    if (this.debug_logs && error) {
      console.error('signOut_error', error);
    }
  }
}

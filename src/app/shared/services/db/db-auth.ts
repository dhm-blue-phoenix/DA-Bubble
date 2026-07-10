import { Injectable, signal, WritableSignal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Supabase } from './db-superbase';
import { Router } from '@angular/router';

import { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class DatabaseAuth {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly router: Router = inject(Router);

  /** Signal, das den aktuellen Anmeldestatus des Benutzers hält. */
  public readonly _isUserLogin: WritableSignal<boolean> = signal<boolean>(false);

  /** Speichert die Profil-ID des aktuell angemeldeten Benutzers */
  private currentUserId: string = '';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupAuthListener();
      this.setupWindowFocusListener();
    }
  }

  /**
   * Lauscht auf Änderungen des Authentifizierungsstatus durch Supabase.
   */
  private setupAuthListener(): void {
    this.supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null): Promise<void> => {
        if (event === 'SIGNED_OUT') {
          this.currentUserId = '';
          this._isUserLogin.set(false);
          this.router.navigate(['/']);
        } else if (session?.user) {
          this.currentUserId = session.user.id;
          this._isUserLogin.set(true);
          this.router.navigate(['/workspace']);
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
            await this.setStatus('online');
          }
        }
      },
    );
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
  private async updateProfileStatus(
    profileId: string,
    value: 'offline' | 'online' | 'away',
  ): Promise<void> {
    if (profileId.length > 5 && value.length > 1) {
      await this.supabase.from('profiles').update({ status: value }).eq('id', profileId).select();
    }
  }

  /**
   * Prüft, ob eine E-Mail-Adresse bereits registriert ist.
   * @param {string} email - Die zu prüfende E-Mail-Adresse.
   * @returns {Promise<boolean>} True, wenn die E-Mail existiert, sonst false.
   */
  public async checkEmailExists(email: string): Promise<boolean> {
    const { data } = await this.supabase.from('profiles').select('id').eq('email', email).limit(1);
    return !!data;
  }

  /**
   * Registriert einen neuen Benutzer und loggt ihn bei Erfolg direkt ein.
   * @param {string} user_email - E-Mail Adresse.
   * @param {string} user_password - Passwort.
   * @param {string} user_name - Anzeigename.
   * @param {string} user_avatar - Avatar-URL oder -Name.
   * @returns {Promise<boolean>} - Gibt ein false zurück wenn ein Duplikat vorliegt ansonsten true.
   */
  public async signUpNewUser(
    user_email: string,
    user_password: string,
    user_name: string,
    user_avatar: string,
  ): Promise<boolean> {
    if (await this.checkEmailExists(user_email)) return false;
    await this.supabase.auth.signUp({
      email: user_email,
      password: user_password,
      options: {
        data: { name: user_name, avatar: user_avatar },
      },
    });
    return true;
  }

  /**
   * Meldet einen bestehenden Benutzer mit E-Mail und Passwort an.
   * @param {string} user_email - E-Mail Adresse.
   * @param {string} user_password - Passwort.
   * @returns {Promise<void>}
   */
  public async signInWithEmail(user_email: string, user_password: string): Promise<void> {
    await this.supabase.auth.signInWithPassword({
      email: user_email,
      password: user_password,
    });
  }

  /**
   * Registriert einen neuen Benutzer mit Google und leitet einen danach zur hauptseite zurück.
   * @returns {Promise<void>}
   */
  public async signInWithGoogle(): Promise<void> {
    await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
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
    await this.supabase.auth.signOut();
  }
}

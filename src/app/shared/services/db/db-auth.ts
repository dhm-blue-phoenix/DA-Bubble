import { inject, Injectable, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Supabase } from './db-superbase';
import { Router } from '@angular/router';

import { PostgrestSingleResponse, Session, SupabaseClient } from '@supabase/supabase-js';
import { DbAuthError, DbPostgrestError } from '../../interfaces/db-error';
import { Profile } from '../../interfaces/profile';

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
      this.setupWindowFocusListener();
    }
  }

  /**
   * Navigiert zu einer Route und fängt dabei mögliche Navigations‑Fehler ab.
   * @param {string[]} commands – Die Router‑Kommandos
   * @returns {Promise<void>}
   */
  private async safeNavigate(commands: string[]): Promise<void> {
    if (this.router && typeof this.router.navigate === 'function') {
      try {
        if (commands[0] === 'select-avatar') {
          await this.router.navigate(commands, {
            state: { provider: 'google' },
          });
        } else {
          await this.router.navigate(commands);
        }
      } catch (e) {
        if (console && console.warn) console.warn('Navigation error suppressed:', e);
      }
    }
  }

  /**
   * Leitet den Nutzer sicher auf die Startseite ('/select-avatar') weiter wo er dan als
   * Google User seinen Avatar wehlen kann.
   */
  public async eventHelperSignedInIsGoogle(profile: Profile): Promise<void> {
    if (!profile['avatar']) {
      this.safeNavigate(['select-avatar']);
    }
  }

  /**
   * Handhabt den Abmeldevorgang (Logout).
   * Setzt die lokale Benutzer-ID zurück, aktualisiert den Login-Status auf 'false'
   * und leitet den Nutzer sicher auf die Startseite ('/') weiter.
   */
  public async eventHelperSignedOut(): Promise<void> {
    this.currentUserId = '';
    this._isUserLogin.set(false);
    await this.safeNavigate(['/']);
  }

  /**
   * Reagiert auf das Password-Recovery-Event.
   * Leitet den Nutzer direkt auf die Seite zur Passwort-Wiederherstellung ('/reset-password') weiter.
   */
  public async eventHelperPasswordRecovery(): Promise<void> {
    await this.safeNavigate(['/reset-password']);
  }

  /**
   * Führt das Haupt-Setup für eine aktive Benutzersitzung aus.
   * Speichert die aktuelle User-ID, setzt den Login-Status auf 'true'
   * und leitet den Nutzer in seinen Hauptarbeitsbereich ('/workspace') weiter.
   *
   * @param session Die aktuelle Supabase-Sitzung oder null
   */
  public async eventHelperMainSetup(session: Session): Promise<void> {
    this.currentUserId = session['user']['id'];
    this._isUserLogin.set(true);
    await this.safeNavigate(['/workspace']);
  }

  /**
   * Führt spezifische Aktionen beim allerersten Laden der Session aus (Initial Session).
   * Setzt den Systemstatus des Benutzers auf 'online'.
   */
  public async eventHelperInitialSession(): Promise<void> {
    this.setStatus('online');
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
    const { error }: DbPostgrestError = await this.supabase
      .from('profiles')
      .update({ status: value })
      .eq('id', profileId)
      .select();
    if (error)
      throw new Error(
        `[ DB_CODE:${error['code']} ] MSG: ${error['message']} | HINT: ${error['hint']}`,
      );
  }

  /**
   * Prüft, ob eine E-Mail-Adresse bereits registriert ist.
   * @param {string} email - Die zu prüfende E-Mail-Adresse.
   * @returns {Promise<boolean>} True, wenn die E-Mail existiert, sonst false.
   */
  public async checkEmailExists(email: string): Promise<boolean> {
    const { data, error }: PostgrestSingleResponse<any> = await this.supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1);
    if (error)
      throw new Error(
        `[ DB_CODE:${error['code']} ] MSG: ${error['message']} | HINT: ${error['hint']}`,
      );
    return Array.isArray(data) && data.length > 0;
  }

  /**
   * Registriert einen neuen Benutzer und loggt ihn bei Erfolg direkt ein.
   * @param {string} user_email - E-Mail-Adresse.
   * @param {string} user_password - Passwort.
   * @param {string} user_name - Anzeigename.
   * @param {string} user_avatar - Avatar-URL oder -Name.
   * @returns {Promise<boolean>} - Gibt ein false zurück, wenn ein Duplikat vorliegt ansonsten true.
   */
  public async signUpNewUser(
    user_email: string,
    user_password: string,
    user_name: string,
    user_avatar: string,
  ): Promise<boolean> {
    if (await this.checkEmailExists(user_email)) return false;
    const { error }: DbAuthError = await this.supabase.auth.signUp({
      email: user_email,
      password: user_password,
      options: {
        data: { name: user_name, avatar: user_avatar },
      },
    });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    return true;
  }

  /**
   * Meldet einen bestehenden Benutzer mit E-Mail und Passwort an.
   * @param {string} user_email - E-Mail-Adresse.
   * @param {string} user_password - Passwort.
   * @returns {Promise<void>}
   */
  public async signInWithEmail(user_email: string, user_password: string): Promise<void> {
    const { error }: DbAuthError = await this.supabase.auth.signInWithPassword({
      email: user_email,
      password: user_password,
    });
    window.location.reload();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Registriert einen neuen Benutzer mit Google und leitet einen danach zur hauptseite zurück.
   * @returns {Promise<void>}
   */
  public async signInWithGoogle(): Promise<void> {
    const { error }: DbAuthError = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Fordert eine E-Mail zum Zurücksetzen des Passworts an.
   * @param {string} email - Die E-Mail-Adresse des Benutzers.
   * @returns {Promise<void>}
   */
  public async resetPasswordForEmail(email: string): Promise<void> {
    const { error }: DbAuthError = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Ändert das Passwort des aktuell angemeldeten Benutzers.
   * @param {string} newPassword - Das neue Passwort.
   * @returns {Promise<void>}
   */
  public async changePassword(newPassword: string): Promise<void> {
    const { error }: DbAuthError = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Meldet den aktuellen Benutzer ab und setzt seinen Status auf 'offline'.
   * @returns {Promise<void>}
   */
  public async signOut(): Promise<void> {
    const userId: string = this.currentUserId;
    this.currentUserId = '';
    if (userId) await this.updateProfileStatus(userId, 'offline');
    const { error }: DbAuthError = await this.supabase.auth.signOut();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }
}

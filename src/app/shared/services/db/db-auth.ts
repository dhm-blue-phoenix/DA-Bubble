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

  /** Signal containing the user's current sign-in status. */
  public readonly _isUserLogin: WritableSignal<boolean> = signal<boolean>(false);

  /** Stores the profile ID of the currently signed-in user. */
  private currentUserId: string = '';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupWindowFocusListener();
    }
  }

  /**
   * Navigates to a route and handles any navigation errors.
   * @param {string[]} commands - The router commands.
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
   * Redirects a Google user without an avatar to `/select-avatar`.
   */
  public async eventHelperSignedInIsGoogle(profile: Profile): Promise<void> {
    if (!profile['avatar']) {
      this.safeNavigate(['select-avatar']);
    }
  }

  /**
   * Handles sign-out.
   * Resets the local user ID, sets the login status to `false`,
   * and redirects the user to the home page (`/`).
   */
  public async eventHelperSignedOut(): Promise<void> {
    this.currentUserId = '';
    this._isUserLogin.set(false);
    await this.safeNavigate(['/']);
  }

  /**
   * Handles the password recovery event.
   * Redirects the user to the password reset page (`/reset-password`).
   */
  public async eventHelperPasswordRecovery(): Promise<void> {
    await this.safeNavigate(['/reset-password']);
  }

  /**
   * Sets up an active user session.
   * Stores the current user ID, sets the login status to `true`,
   * and redirects the user to the workspace (`/workspace`).
   *
   * @param session The current Supabase session or null.
   */
  public async eventHelperMainSetup(session: Session): Promise<void> {
    this.currentUserId = session['user']['id'];
    this._isUserLogin.set(true);
    await this.safeNavigate(['/workspace']);
  }

  /**
   * Performs initial-session setup.
   * Sets the user's status to `online`.
   */
  public async eventHelperInitialSession(): Promise<void> {
    this.setStatus('online');
  }

  /**
   * Tracks window focus to set the user's status to `away` or `online`.
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
   * Returns the profile ID of the currently signed-in user.
   * @returns {string} The profile ID, or an empty string.
   */
  public getCurrentUserId(): string {
    return this.currentUserId;
  }

  /**
   * Updates the current profile's status.
   * @param {'offline' | 'online' | 'away'} status - The new status.
   * @returns {Promise<void>}
   */
  private async setStatus(status: 'offline' | 'online' | 'away'): Promise<void> {
    const profileId: string = this.getCurrentUserId();
    if (profileId) {
      await this.updateProfileStatus(profileId, status);
    }
  }

  /**
   * Updates the status of a specific profile in the database.
   * @param {string} profileId - The profile ID.
   * @param {'offline' | 'online' | 'away'} value - The new status.
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
   * Checks whether an email address is already registered.
   * @param {string} email - The email address to check.
   * @returns {Promise<boolean>} True if the email exists; otherwise, false.
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
   * Registers a new user and signs them in on success.
   * @param {string} user_email - The email address.
   * @param {string} user_password - The password.
   * @param {string} user_name - The display name.
   * @param {string} user_avatar - The avatar URL or name.
   * @returns {Promise<boolean>} - Returns `false` if the email is already registered.
   */
  public async signUpNewUser(
    user_email: string,
    user_password: string,
    user_name: string,
    user_avatar: string,
  ): Promise<false | void> {
    if (await this.checkEmailExists(user_email)) return false;
    const { error }: DbAuthError = await this.supabase.auth.signUp({
      email: user_email,
      password: user_password,
      options: {
        data: { name: user_name, avatar: user_avatar },
      },
    });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    this.setStatus('online');
    window.location.reload();
  }

  /**
   * Signs in an existing user with an email and password.
   * @param {string} user_email - The email address.
   * @param {string} user_password - The password.
   * @returns {Promise<void>}
   */
  public async signInWithEmail(user_email: string, user_password: string): Promise<void> {
    const { error }: DbAuthError = await this.supabase.auth.signInWithPassword({
      email: user_email,
      password: user_password,
    });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    this.setStatus('online');
    window.location.reload();
  }

  /**
   * Signs in a user with Google and redirects them to the workspace.
   * @returns {Promise<void>}
   */
  public async signInWithGoogle(): Promise<void> {
    const { error }: DbAuthError = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/workspace`,
      },
    });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Requests a password reset email.
   * @param {string} email - The user's email address.
   * @returns {Promise<void>}
   */
  public async resetPasswordForEmail(email: string): Promise<void> {
    const { error }: DbAuthError = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Changes the password of the currently signed-in user.
   * @param {string} newPassword - The new password.
   * @returns {Promise<void>}
   */
  public async changePassword(newPassword: string): Promise<void> {
    const { error }: DbAuthError = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Signs out the current user and sets their status to `offline`.
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

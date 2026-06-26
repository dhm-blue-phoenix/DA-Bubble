import { inject, Injectable, Signal } from '@angular/core';

import { DatabaseProfiles } from './db/db-profiles';
import { DatabaseAuth } from './db/db-auth';
import { Profiles, Profile } from '../interfaces/profile';
import { DatabaseChats } from './db/db-chats';

@Injectable({
  providedIn: 'root',
})
export class Database {
  private readonly db_profiles: DatabaseProfiles = inject(DatabaseProfiles);
  private readonly db_auth: DatabaseAuth = inject(DatabaseAuth);
  private readonly db_chats: DatabaseChats = inject(DatabaseChats);

  /*
   * Das Signal Profiles gibt ein Array mit allen existirenten Profilen zurück
   * */
  public readonly profiles: Signal<Profiles> = this.db_profiles._profiles.asReadonly();

  /*
   * Das Signal isLogin gibt einen Boolischen wert zurück und ermöglicht das überprüffen
   * ob der User noch Angemeldet ist.
   * */
  public readonly isLogin: Signal<boolean> = this.db_auth._isUserLogin.asReadonly();

  constructor() {
    /*
     * Ladet alle Profile von der Datenbank
     * */
    this.db_profiles.getProfiles();
  }

  /*
   * Notiz: Eventuelle anpassung bei den funktionen für zusetzliches return error handlieng!
   * */

  /*
   * Login und Registrierung
   * */
  public register(user_email: string, user_password: string, user_name: string): void {
    this.db_auth.signUpNewUser(user_email, user_password, user_name);
  }

  public login(user_email: string, user_password: string): void {
    this.db_auth.signInWithEmail(user_email, user_password);
  }

  public logout(): void {
    this.db_profiles._profiles.set([]);
    this.db_auth.signOut();
  }

  /*
   * Ladet die daten eines bestimmten Profiels übergeben wirt die Profil Id
   * */
  public async getProfile(profileId: string): Promise<Profile | null> {
    return this.db_profiles.getProfile(profileId);
  }

  /*
   * Aktuallisirt den Benutzernamen und benötigt die profil id und den neuen namen
   * */
  public async updateProfileName(profileId: string, value: string): Promise<void> {
    this.db_profiles.updateProfileName(profileId, value);
  }

  public async getChatId(otherUserId: string): Promise<string | null> {
    return await this.db_chats.getChatId(
      this.db_auth.getLocalStorageCurrentProfileId(),
      otherUserId,
    );
  }
}

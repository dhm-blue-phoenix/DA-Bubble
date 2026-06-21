import { inject, Injectable, Signal } from '@angular/core';

import { DatabaseProfiles } from './db/db-profiles';
import { DatabaseAuth } from './db/db-auth';
import { Profiles, Profile } from '../interfaces/profile';

@Injectable({
  providedIn: 'root',
})
export class Database {
  private readonly db_profiles: DatabaseProfiles = inject(DatabaseProfiles);
  private readonly db_auth: DatabaseAuth = inject(DatabaseAuth);

  public readonly profiles: Signal<Profiles> = this.db_profiles.profiles;

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
    this.db_auth.signOut();
  }

  /*
   * Profile Verwaltung
   * */
  public async getProfile(profileId: string): Promise<Profile | null> {
    return this.db_profiles.getProfile(profileId);
  }

  public async updateProfileName(profileId: string, value: string): Promise<void> {
    this.db_profiles.updateProfileName(profileId, value);
  }
}

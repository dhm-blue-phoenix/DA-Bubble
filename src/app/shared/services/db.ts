import { inject, Injectable, Signal } from '@angular/core';

import { DatabaseProfiles } from './db/db-profiles';
import { DatabaseAuth } from './db/db-auth';
import { DatabaseChats } from './db/db-chats';
import { DatabaseMessages, ReactionResult } from './db/db-messages';

import { Profiles, Profile } from '../interfaces/profile';
import { Messages } from '../interfaces/messages';

@Injectable({
  providedIn: 'root',
})
export class Database {
  private readonly db_profiles: DatabaseProfiles = inject(DatabaseProfiles);
  private readonly db_auth: DatabaseAuth = inject(DatabaseAuth);
  private readonly db_chats: DatabaseChats = inject(DatabaseChats);
  private readonly db_messages: DatabaseMessages = inject(DatabaseMessages);

  public readonly profiles: Signal<Profiles> = this.db_profiles._profiles.asReadonly();
  public readonly isLogin: Signal<boolean> = this.db_auth._isUserLogin.asReadonly();
  public readonly messages: Signal<Messages> = this.db_messages._messages.asReadonly();

  constructor() {
    this.db_profiles.getProfiles();
  }

  public register(
    user_email: string,
    user_password: string,
    user_name: string,
    user_avatar: string,
  ): void {
    this.db_auth.signUpNewUser(user_email, user_password, user_name, user_avatar);
  }

  public sendEmailForPasswordReset(email: string): void {
    /*
     * Wichtig: Bitte nicht verwenden diesse Funktion ist noch nicht fertig
     *           und ist nicht auf funktionfehigkeit getestet!!!
     * */
    return;

    this.db_auth.resetPasswordForEmail(email);
  }

  public updatePassword(newPassword: string): void {
    /*
     * Wichtig: Bitte nicht verwenden diesse Funktion ist noch nicht fertig
     *           und ist nicht auf funktionfehigkeit getestet!!!
     * */
    return;

    this.db_auth.changePassword(newPassword);
  }

  public login(user_email: string, user_password: string): void {
    this.db_auth.signInWithEmail(user_email, user_password);
  }

  public logout(): void {
    this.db_profiles._profiles.set([]);
    this.db_auth.signOut();
  }

  public async getProfile(profileId: string): Promise<Profile | null> {
    return await this.db_profiles.getProfile(profileId);
  }

  public editProfileName(profileId: string, value: string): void {
    this.db_profiles.updateProfileName(profileId, value);
  }

  public async getChatId(otherUserId: string): Promise<string | null> {
    return await this.db_chats.getChatId(
      this.db_auth.getLocalStorageCurrentProfileId(),
      otherUserId,
    );
  }

  public newMsg(chatId: string, senderId: string, content: string): void {
    this.db_messages.createNewMessage(chatId, senderId, content);
  }

  public editMsg(msgId: string, newContent: string): void {
    this.db_messages.updateMessage(msgId, newContent);
  }

  public loadMsg(chatId: string): void {
    this.db_messages.getChatMessages(chatId);
  }

  public async toggleReaction(
    msgId: string,
    senderId: string,
    emoji: string,
  ): Promise<ReactionResult> {
    return this.db_messages.toggleReaction(msgId, senderId, emoji);
  }
}

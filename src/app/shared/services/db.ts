import { inject, Injectable, Signal } from '@angular/core';

import { DatabaseProfiles } from './db/db-profiles';
import { DatabaseAuth } from './db/db-auth';
import { DatabaseChats } from './db/db-chats';
import { DatabaseMessages } from './db/db-messages';
import { DatabaseChannels } from './db/db-channels';
import { DatabaseThreats } from './db/db-threats';

import { Profiles, Profile } from '../interfaces/profile';
import { Messages } from '../interfaces/messages';
import { ReturnFromCreateNewChannel, SignalChannel } from '../interfaces/db/db-channels';
import { MsgType, ReactionResult } from '../interfaces/db/db-messages';

@Injectable({
  providedIn: 'root',
})
export class Database {
  private readonly db_profiles: DatabaseProfiles = inject(DatabaseProfiles);
  private readonly db_auth: DatabaseAuth = inject(DatabaseAuth);
  private readonly db_chats: DatabaseChats = inject(DatabaseChats);
  private readonly db_messages: DatabaseMessages = inject(DatabaseMessages);
  private readonly db_channels: DatabaseChannels = inject(DatabaseChannels);
  private readonly db_threads: DatabaseThreats = inject(DatabaseThreats);

  public readonly profiles: Signal<Profiles> = this.db_profiles._profiles.asReadonly();
  public readonly isLogin: Signal<boolean> = this.db_auth._isUserLogin.asReadonly();
  public readonly chatMsg: Signal<Messages> = this.db_messages._chat_messages.asReadonly();
  public readonly channelMsg: Signal<Messages> = this.db_messages._channel_messages.asReadonly();
  public readonly threadMsg: Signal<Messages> = this.db_messages._thread_messages.asReadonly();
  public readonly channels: Signal<SignalChannel> = this.db_channels._channels.asReadonly();
  public readonly channel: Signal<SignalChannel> = this.db_channels._channel.asReadonly();

  constructor() {
    this.db_profiles.getProfiles();
  }

  public register(
    user_email: string,
    user_password: string,
    user_name: string,
    user_avatar: string,
  ): void {
    this.db_auth.signUpNewUser(
      user_email.trim(),
      user_password.trim(),
      user_name.trim(),
      user_avatar.trim().toLowerCase(),
    );
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
    this.db_auth.signInWithEmail(user_email.trim(), user_password.trim());
  }

  public logout(): void {
    this.db_profiles._profiles.set([]);
    this.db_messages._chat_messages.set([]);
    this.db_messages._channel_messages.set([]);
    this.db_messages._thread_messages.set([]);
    this.db_channels._channels.set([]);
    this.db_channels._channel.set({});
    this.db_auth.signOut();
  }

  public async getProfile(profileId: string): Promise<Profile | null> {
    return await this.db_profiles.getProfile(profileId);
  }

  public editProfileName(profileId: string, value: string): void {
    this.db_profiles.updateProfileName(profileId, value.trim());
  }

  public async getChatId(otherUserId: string): Promise<string> {
    return await this.db_chats.getChatId(
      this.db_auth.getLocalStorageCurrentProfileId(),
      otherUserId,
    );
  }

  public newMsg(msgType: MsgType, threadChannelId: string | null, id: string, senderId: string, content: string): void {
    this.db_messages.createNewMessage(msgType, threadChannelId, id.trim(), senderId.trim(), content.trim());
  }

  public editMsg(msgId: string, newContent: string): void {
    this.db_messages.updateMessage(msgId.trim(), newContent.trim());
  }

  public loadMsg(msgType: MsgType, id: string): void {
    this.db_messages.getMessages(msgType, id.trim());
  }

  public async toggleReaction(
    msgId: string,
    senderId: string,
    emoji: string,
  ): Promise<ReactionResult> {
    return this.db_messages.toggleReaction(
      msgId.trim(),
      senderId.trim(),
      emoji.trim().toLowerCase(),
    );
  }

  public async newChannel(
    userId: string,
    title: string,
    desc: string,
  ): Promise<ReturnFromCreateNewChannel> {
    return await this.db_channels.createNewChannel(userId.trim(), title.trim(), desc.trim());
  }

  public editChannel(channelId: string, title: string, desc: string): void {
    this.db_channels.updateChannelData(channelId.trim(), title.trim(), desc.trim());
  }

  public addChannelMember(channelId: string, userId: string): void {
    this.db_channels.createNewMember(channelId.trim(), userId.trim(), 'admin');
  }

  public removeChannelMember(channelId: string, userId: string): void {
    this.db_channels.removeMember(channelId.trim(), userId.trim());
  }

  public getChannels(userId: string): void {
    this.db_channels.getChannelIds(userId.trim());
  }

  public getChannelContent(channelId: string): void {
    this.db_channels.getChannelData(channelId.trim());
  }

  public async getThreadId(messageId: string): Promise<string> {
    return await this.db_threads.getThreatId(messageId);
  }
}

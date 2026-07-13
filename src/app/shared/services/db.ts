import { inject, Injectable, Signal } from '@angular/core';

import { DatabaseProfiles } from './db/db-profiles';
import { DatabaseAuth } from './db/db-auth';
import { DatabaseChats } from './db/db-chats';
import { DatabaseMessages } from './db/db-messages';
import { DatabaseChannels } from './db/db-channels';
import { DatabaseThreads } from './db/db-threads';

import { Profiles, Profile } from '../interfaces/profile';
import { Messages } from '../interfaces/messages';
import { ReturnFromCreateNewChannel, SignalChannel, SignalChannels } from '../interfaces/db/db-channels';
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
  private readonly db_threads: DatabaseThreads = inject(DatabaseThreads);

  /** Ein Read-Only Signal mit allen Benutzerprofilen. */
  public readonly profiles: Signal<Profiles> = this.db_profiles._profiles.asReadonly();
  /** Ein Read-Only Signal, das den Login-Status des aktuellen Benutzers hält (true/false). */
  public readonly isLogin: Signal<boolean> = this.db_auth._isUserLogin.asReadonly();
  /** Ein Read-Only Signal mit den direkten Chat-Nachrichten der aktuellen Ansicht. */
  public readonly chatMsg: Signal<Messages> = this.db_messages._chat_messages.asReadonly();
  /** Ein Read-Only Signal mit den Nachrichten des aktuellen Kanals. */
  public readonly channelMsg: Signal<Messages> = this.db_messages._channel_messages.asReadonly();
  /** Ein Read-Only Signal mit den Nachrichten des aktuellen Threads. */
  public readonly threadMsg: Signal<Messages> = this.db_messages._thread_messages.asReadonly();
  /** Ein Read-Only Signal mit einer Liste der Kanäle (IDs und Namen), in denen der Benutzer Mitglied ist. */
  public readonly channels: Signal<SignalChannels> = this.db_channels._channels.asReadonly();
  /** Ein Read-Only Signal mit den detaillierten Daten des aktuell geöffneten Kanals. */
  public readonly channel: Signal<SignalChannel> = this.db_channels._channel.asReadonly();

  constructor() {
    this.db_profiles.getProfiles();
  }

  /**
   * Registriert einen neuen Benutzer.
   * @param {string} user_email - Die E-Mail Adresse.
   * @param {string} user_password - Das Passwort.
   * @param {string} user_name - Der Anzeigename.
   * @param {string} user_avatar - URL oder Pfad zum Profilbild (Avatar).
   */
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

  /**
   * Sendet eine E-Mail zum Zurücksetzen des Passworts.
   * Wichtig: Diese Funktion ist derzeit noch in Arbeit und deaktiviert.
   * @param {string} email - Die E-Mail Adresse des Benutzers.
   */
  public sendEmailForPasswordReset(email: string): void {
    /*
     * Wichtig: Bitte nicht verwenden diesse Funktion ist noch nicht fertig
     *           und ist nicht auf funktionfehigkeit getestet!!!
     * */
    return;

    this.db_auth.resetPasswordForEmail(email);
  }

  /**
   * Aktualisiert das Passwort des aktuell angemeldeten Benutzers.
   * Wichtig: Diese Funktion ist derzeit noch in Arbeit und deaktiviert.
   * @param {string} newPassword - Das neue Passwort.
   */
  public updatePassword(newPassword: string): void {
    /*
     * Wichtig: Bitte nicht verwenden diesse Funktion ist noch nicht fertig
     *           und ist nicht auf funktionfehigkeit getestet!!!
     * */
    return;

    this.db_auth.changePassword(newPassword);
  }

  /**
   * Meldet einen bestehenden Benutzer an.
   * @param {string} user_email - Die E-Mail Adresse.
   * @param {string} user_password - Das Passwort.
   */
  public login(user_email: string, user_password: string): void {
    this.db_auth.signInWithEmail(user_email.trim(), user_password.trim());
  }

  /**
   * Meldet den aktuellen Benutzer ab und leert alle gespeicherten Signals (Caches).
   */
  public logout(): void {
    this.db_profiles._profiles.set([]);
    this.db_messages._chat_messages.set([]);
    this.db_messages._channel_messages.set([]);
    this.db_messages._thread_messages.set([]);
    this.db_channels._channels.set([]);
    this.db_channels._channel.set(null);
    this.db_auth.signOut();
  }

  /**
   * Lädt ein einzelnes Profil asynchron anhand seiner ID.
   * @param {string} profileId - Die ID des Profils.
   * @returns {Promise<Profile | null>} Die Profildaten oder null.
   */
  public async getProfile(profileId: string): Promise<Profile | null> {
    return await this.db_profiles.getProfile(profileId);
  }

  /**
   * Aktualisiert den Anzeigenamen eines bestehenden Profils.
   * @param {string} profileId - Die Profil-ID.
   * @param {string} value - Der neue Anzeigename.
   */
  public editProfileName(profileId: string, value: string): void {
    this.db_profiles.updateProfileName(profileId, value.trim());
  }

  /**
   * Gibt die ID des gemeinsamen Chats zwischen dem angemeldeten und einem anderen Benutzer zurück (erstellt bei Bedarf einen neuen).
   * @param {string} otherUserId - Die Profil-ID des Gesprächspartners.
   * @returns {Promise<string>} Die ID des Chats.
   */
  public async getChatId(otherUserId: string): Promise<string> {
    return await this.db_chats.getChatId(
      this.db_auth.getCurrentUserId(),
      otherUserId,
    );
  }

  /**
   * Erstellt eine neue Nachricht in einem Chat, Channel oder Thread.
   * @param {MsgType} msgType - Der Ziel-Typ ('chat', 'channel', 'thread').
   * @param {string | null} threadChannelId - Falls es ein Thread ist, die übergeordnete Channel-ID (sonst null).
   * @param {string} id - Die Ziel-ID (Chat-, Channel- oder Thread-ID).
   * @param {string} senderId - Die Profil-ID des Absenders.
   * @param {string} content - Der Text der Nachricht.
   */
  public newMsg(msgType: MsgType, threadChannelId: string | null, id: string, senderId: string, content: string): void {
    this.db_messages.createNewMessage(msgType, threadChannelId, id.trim(), senderId.trim(), content.trim());
  }

  /**
   * Aktualisiert den Inhalt einer bestehenden Nachricht.
   * @param {string} msgId - Die Nachrichten-ID.
   * @param {string} newContent - Der neue Text.
   */
  public editMsg(msgId: string, newContent: string): void {
    this.db_messages.updateMessage(msgId.trim(), newContent.trim());
  }

  /**
   * Lädt die Nachrichten für einen spezifischen Chat, Channel oder Thread in das jeweilige Signal.
   * @param {MsgType} msgType - Der Ziel-Typ.
   * @param {string} id - Die ID der Quelle.
   */
  public loadMsg(msgType: MsgType, id: string): void {
    this.db_messages.getMessages(msgType, id.trim());
  }

  /**
   * Fügt eine Emoji-Reaktion hinzu oder entfernt sie, falls sie vom selben Nutzer bereits gesetzt wurde.
   * @param {string} msgId - Die Nachrichten-ID.
   * @param {string} senderId - Die Profil-ID des reagierenden Nutzers.
   * @param {string} emoji - Das Emoji.
   * @returns {Promise<ReactionResult>} Das Ergebnis der Aktion ('added' oder 'removed').
   */
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

  /**
   * Erstellt einen neuen Kanal und fügt den Ersteller als 'admin' hinzu.
   * @param {string} userId - Die Profil-ID des Erstellers.
   * @param {string} title - Der Name des Kanals.
   * @param {string} desc - Die Beschreibung des Kanals.
   * @returns {Promise<ReturnFromCreateNewChannel>} Erfolg oder Misserfolg (z.B. bei Duplikat).
   */
  public async newChannel(
    userId: string,
    title: string,
    desc: string,
  ): Promise<ReturnFromCreateNewChannel> {
    return await this.db_channels.createNewChannel(userId.trim(), title.trim(), desc.trim());
  }

  /**
   * Aktualisiert den Namen und die Beschreibung eines bestehenden Kanals.
   * @param {string} channelId - Die Kanal-ID.
   * @param {string} title - Der neue Name.
   * @param {string} desc - Die neue Beschreibung.
   */
  public editChannel(channelId: string, title: string, desc: string): void {
    this.db_channels.updateChannelData(channelId.trim(), title.trim(), desc.trim());
  }

  /**
   * Fügt einen Benutzer als Admin-Mitglied zu einem Kanal hinzu.
   * @param {string} channelId - Die Kanal-ID.
   * @param {string} userId - Die Profil-ID des Benutzers.
   */
  public addChannelMember(channelId: string, userId: string): void {
    this.db_channels.createNewMember(channelId.trim(), userId.trim(), 'admin');
  }

  /**
   * Entfernt einen Benutzer aus einem Kanal.
   * @param {string} channelId - Die Kanal-ID.
   * @param {string} userId - Die Profil-ID des Benutzers.
   */
  public removeChannelMember(channelId: string, userId: string): void {
    this.db_channels.removeMember(channelId.trim(), userId.trim());
  }

  /**
   * Lädt alle Kanäle, in denen ein Benutzer Mitglied ist, in das `channels` Signal.
   * @param {string} userId - Die Profil-ID des Benutzers.
   */
  public getChannels(userId: string): void {
    this.db_channels.getChannelIds(userId.trim());
  }

  /**
   * Lädt die Detaildaten eines bestimmten Kanals in das `channel` Signal.
   * @param {string} channelId - Die Kanal-ID.
   */
  public getChannelContent(channelId: string): void {
    this.db_channels.getChannelData(channelId.trim());
  }

  /**
   * Ermittelt die Thread-ID für eine Ursprungs-Nachricht. Erstellt bei Bedarf einen neuen Thread.
   * @param {string} messageId - Die ID der Ursprungs-Nachricht.
   * @returns {Promise<string>} Die ID des Threads.
   */
  public async getThreadId(messageId: string): Promise<string> {
    return await this.db_threads.getThreadId(messageId);
  }
}

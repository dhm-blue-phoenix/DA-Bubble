import { inject, Injectable, PLATFORM_ID, Signal } from '@angular/core';

import { DatabaseProfiles } from './db/db-profiles';
import { DatabaseAuth } from './db/db-auth';
import { DatabaseChats } from './db/db-chats';
import { DatabaseMessages } from './db/db-messages';
import { DatabaseChannels } from './db/db-channels';
import { DatabaseThreads } from './db/db-threads';

import { Profile, Profiles } from '../interfaces/profile';
import { Messages } from '../interfaces/messages';
import { SignalChannel } from '../interfaces/db/db-channels';
import { MsgType, ReactionResult } from '../interfaces/db/db-messages';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class Database {
  private readonly platformId: Object = inject(PLATFORM_ID);

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
  public readonly channels: Signal<SignalChannel> = this.db_channels._channels.asReadonly();
  /** Ein Read-Only Signal mit den detaillierten Daten des aktuell geöffneten Kanals. */
  public readonly channel: Signal<SignalChannel> = this.db_channels._channel.asReadonly();

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.loadProfiles();
    }
  }

  /**
   * Ladet alle Benutzerprofile
   */
  private async loadProfiles(): Promise<void> {
    try {
      await this.db_profiles.getProfiles();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Registriert einen neuen Benutzer.
   * @param {string} user_email - Die E-Mail Adresse.
   * @param {string} user_password - Das Passwort.
   * @param {string} user_name - Der Anzeigename.
   * @param {string} user_avatar - URL oder Pfad zum Profilbild (Avatar).
   * @return {boolean} - true bei Erfolg oder false bei einem Duplikat.
   */
  public async register(
    user_email: string,
    user_password: string,
    user_name: string,
    user_avatar: string,
  ): Promise<boolean> {
    try {
      return await this.db_auth.signUpNewUser(
        user_email.trim(),
        user_password.trim(),
        user_name.trim(),
        user_avatar.trim().toLowerCase(),
      );
    } catch (error) {
      console.error(error);
      return false;
    }
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
  public async login(user_email: string, user_password: string): Promise<void> {
    try {
      await this.db_auth.signInWithEmail(user_email.trim(), user_password.trim());
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Meldet einen bestehenden Benutzer mit seinen Google Account an.
   */
  public async loginWithGoogle(): Promise<void> {
    try {
      await this.db_auth.signInWithGoogle();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Meldet den aktuellen Benutzer ab und leert alle gespeicherten Signals (Caches).
   */
  public async logout(): Promise<void> {
    try {
      this.db_profiles._profiles.set([]);
      this.db_messages._chat_messages.set([]);
      this.db_messages._channel_messages.set([]);
      this.db_messages._thread_messages.set([]);
      this.db_channels._channels.set([]);
      this.db_channels._channel.set({});
      await this.db_auth.signOut();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Lädt ein einzelnes Profil asynchron anhand seiner ID.
   * @param {string} profileId - Die ID des Profils.
   * @returns {Promise<Profile | null>} Die Profildaten oder null.
   */
  public async getProfile(profileId: string): Promise<Profile | null> {
    try {
      return await this.db_profiles.getProfile(profileId);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Aktualisiert den Anzeigenamen eines bestehenden Profils.
   * @param {string} profileId - Die Profil-ID.
   * @param {string} value - Der neue Anzeigename.
   */
  public async editProfileName(profileId: string, value: string): Promise<void> {
    try {
      await this.db_profiles.updateProfileName(profileId, value.trim());
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Gibt die ID des gemeinsamen Chats zwischen dem angemeldeten und einem anderen Benutzer zurück (erstellt bei Bedarf einen neuen).
   * @param {string} otherUserId - Die Profil-ID des Gesprächspartners.
   * @returns {Promise<string>} Die ID des Chats.
   */
  public async getChatId(otherUserId: string): Promise<string> {
    try {
      return await this.db_chats.getChatId(this.db_auth.getCurrentUserId(), otherUserId);
    } catch (error) {
      console.error(error);
      return '';
    }
  }

  /**
   * Erstellt eine neue Nachricht in einem Chat, Channel oder Thread.
   * @param {MsgType} msgType - Der Ziel-Typ ('chat', 'channel', 'thread').
   * @param {string | null} threadChannelId - Falls es ein Thread ist, die übergeordnete Channel-ID (sonst null).
   * @param {string} id - Die Ziel-ID (Chat-, Channel- oder Thread-ID).
   * @param {string} senderId - Die Profil-ID des Absenders.
   * @param {string} content - Der Text der Nachricht.
   */
  public async newMsg(
    msgType: MsgType,
    threadChannelId: string | null,
    id: string,
    senderId: string,
    content: string,
  ): Promise<void> {
    try {
      await this.db_messages.createNewMessage(
        msgType,
        threadChannelId,
        id.trim(),
        senderId.trim(),
        content.trim(),
      );
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Aktualisiert den Inhalt einer bestehenden Nachricht.
   * @param {string} msgId - Die Nachrichten-ID.
   * @param {string} newContent - Der neue Text.
   */
  public async editMsg(msgId: string, newContent: string): Promise<void> {
    try {
      await this.db_messages.updateMessage(msgId.trim(), newContent.trim());
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Lädt die Nachrichten für einen spezifischen Chat, Channel oder Thread in das jeweilige Signal.
   * @param {MsgType} msgType - Der Ziel-Typ.
   * @param {string} id - Die ID der Quelle.
   */
  public async loadMsg(msgType: MsgType, id: string): Promise<void> {
    try {
      await this.db_messages.getMessages(msgType, id.trim());
    } catch (error) {
      console.error(error);
    }
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
  ): Promise<ReactionResult | null> {
    try {
      return await this.db_messages.toggleReaction(
        msgId.trim(),
        senderId.trim(),
        emoji.trim().toLowerCase(),
      );
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Erstellt einen neuen Kanal und fügt den Ersteller als 'admin' hinzu.
   * @param {string} userId - Die Profil-ID des Erstellers.
   * @param {string} title - Der Name des Kanals.
   * @param {string} desc - Die Beschreibung des Kanals.
   * @returns {Promise<boolean>} - true bei Erfolg oder false bei einem Duplikat.
   */
  public async newChannel(userId: string, title: string, desc: string): Promise<boolean> {
    try {
      return await this.db_channels.createNewChannel(userId.trim(), title.trim(), desc.trim());
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /**
   * Aktualisiert den Namen und die Beschreibung eines bestehenden Kanals.
   * @param {string} channelId - Die Kanal-ID.
   * @param {string} title - Der neue Name.
   * @param {string} desc - Die neue Beschreibung.
   */
  public async editChannel(channelId: string, title: string, desc: string): Promise<void> {
    try {
      await this.db_channels.updateChannelData(channelId.trim(), title.trim(), desc.trim());
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Fügt einen Benutzer als Admin-Mitglied zu einem Kanal hinzu.
   * @param {string} channelId - Die Kanal-ID.
   * @param {string} userId - Die Profil-ID des Benutzers.
   */
  public async addChannelMember(channelId: string, userId: string): Promise<void> {
    try {
      await this.db_channels.createNewMember(channelId.trim(), userId.trim(), 'admin');
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Entfernt einen Benutzer aus einem Kanal.
   * @param {string} channelId - Die Kanal-ID.
   * @param {string} userId - Die Profil-ID des Benutzers.
   */
  public async removeChannelMember(channelId: string, userId: string): Promise<void> {
    try {
      await this.db_channels.removeMember(channelId.trim(), userId.trim());
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Lädt alle Kanäle, in denen ein Benutzer Mitglied ist, in das `channels` Signal.
   * @param {string} userId - Die Profil-ID des Benutzers.
   */
  public async getChannels(userId: string): Promise<void> {
    try {
      await this.db_channels.getChannelIds(userId.trim());
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Lädt die Detaildaten eines bestimmten Kanals in das `channel` Signal.
   * @param {string} channelId - Die Kanal-ID.
   */
  public async getChannelContent(channelId: string): Promise<void> {
    try {
      await this.db_channels.getChannelData(channelId.trim());
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Ermittelt die Thread-ID für eine Ursprungs-Nachricht. Erstellt bei Bedarf einen neuen Thread.
   * @param {string} messageId - Die ID der Ursprungs-Nachricht.
   * @returns {Promise<string>} Die ID des Threads.
   */
  public async getThreadId(messageId: string): Promise<string> {
    try {
      return await this.db_threads.getThreadId(messageId);
    } catch (error) {
      console.error(error);
      return '';
    }
  }
}

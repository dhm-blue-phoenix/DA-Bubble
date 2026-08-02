import { inject, Injectable, PLATFORM_ID, Signal } from '@angular/core';

import { Supabase } from './db/db-superbase';
import { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';

import { DatabaseProfiles } from './db/db-profiles';
import { DatabaseAuth } from './db/db-auth';
import { DatabaseChats } from './db/db-chats';
import { DatabaseMessages } from './db/db-messages';
import { DatabaseChannels } from './db/db-channels';
import { DatabaseThreads } from './db/db-threads';

import { Profile, Profiles } from '../interfaces/profile';
import { Messages } from '../interfaces/messages';
import { SignalChannel, SignalChannels } from '../interfaces/db/db-channels';
import { MsgType, ReactionResult } from '../interfaces/db/db-messages';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class Database {
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
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
  public readonly channels: Signal<SignalChannels> = this.db_channels._channels.asReadonly();
  /** Ein Read-Only Signal mit den detaillierten Daten des aktuell geöffneten Kanals. */
  public readonly channel: Signal<SignalChannel> = this.db_channels._channel.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadProfiles();
      this.setupAuthListener();
    }
  }

  /**
   * Lauscht auf Änderungen des Authentifizierungsstatus durch Supabase.
   */
  private setupAuthListener(): void {
    this.supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null): Promise<void> => {
        if (!session?.user) return this.db_auth.eventHelperSignedOut();
        this.db_auth.eventHelperMainSetup(session);
        switch (event) {
          case 'SIGNED_IN':
            this.eventHelperSignedIn(session);
            break;
          case 'SIGNED_OUT':
            this.db_auth.eventHelperSignedOut();
            break;
          case 'PASSWORD_RECOVERY':
            this.db_auth.eventHelperPasswordRecovery();
            break;
          case 'INITIAL_SESSION':
            this.db_auth.eventHelperInitialSession();
            break;
        }
      },
    );
  }

  /**
   * Helper Funktion fürs Anmelden
   */
  private async eventHelperSignedIn(session: Session): Promise<void> {
    const provider: string | undefined = session['user']['app_metadata']['provider'];
    const profile: Profile | null = await this.db_profiles.getProfile(
      this.db_auth.getCurrentUserId(),
    );
    this.db_auth.eventHelperInitialSession();
    if (provider === 'google' && profile) {
      this.db_auth.eventHelperSignedInIsGoogle(profile);
    }
  }

  /**
   * Hilfsmethode für try/catch um code wiederholungen zu vermeiden
   */
  private async safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error) console.error(error);
      return fallback;
    }
  }

  /**
   * Ladet alle Benutzerprofile
   */
  private async loadProfiles(): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_profiles.getProfiles(), undefined);
  }

  /**
   * Gibt die ID des aktuell angemeldeten Benutzers zurück.
   * @returns {string} Die Profil-ID oder ein leerer String.
   */
  public getCurrentUserId(): string {
    return this.db_auth.getCurrentUserId();
  }

  /**
   * Registriert einen neuen Benutzer.
   * @param {string} user_email - Die E-Mail-Adresse.
   * @param {string} user_password - Das Passwort.
   * @param {string} user_name - Der Anzeigename.
   * @param {string} user_avatar - URL oder Pfad zum Profilbild (Avatar).
   * @returns {Promise<boolean>} - true bei Erfolg oder false bei einem Duplikat.
   */
  public async register(
    user_email: string,
    user_password: string,
    user_name: string,
    user_avatar: string,
  ): Promise<boolean> {
    return await this.safeCall(
      (): Promise<boolean> =>
        this.db_auth.signUpNewUser(
          user_email.trim(),
          user_password.trim(),
          user_name.trim(),
          user_avatar.trim().toLowerCase(),
        ),
      false,
    );
  }

  /**
   * Sendet eine E-Mail zum Zurücksetzen des Passworts.
   * @param {string} email - Die E-Mail-Adresse des Benutzers.
   */
  public async sendEmailForPasswordReset(email: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_auth.resetPasswordForEmail(email), undefined);
  }

  /**
   * Aktualisiert das Passwort des aktuell angemeldeten Benutzers.
   * @param {string} newPassword - Das neue Passwort.
   */
  public async updatePassword(newPassword: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_auth.changePassword(newPassword), undefined);
  }

  /**
   * Meldet einen bestehenden Benutzer an.
   * @param {string} user_email - Die E-Mail-Adresse.
   * @param {string} user_password - Das Passwort.
   */
  public async login(user_email: string, user_password: string): Promise<void> {
    await this.safeCall(
      (): Promise<void> => this.db_auth.signInWithEmail(user_email.trim(), user_password.trim()),
      undefined,
    );
  }

  /**
   * Meldet einen bestehenden Benutzer mit seinen Google Account an.
   */
  public async loginWithGoogle(): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_auth.signInWithGoogle(), undefined);
  }

  /**
   * Meldet den aktuellen Benutzer ab und leert alle gespeicherten Signals (Caches).
   */
  public async logout(): Promise<void> {
    this.db_profiles._profiles.set([]);
    this.db_messages._chat_messages.set([]);
    this.db_messages._channel_messages.set([]);
    this.db_messages._thread_messages.set([]);
    this.db_channels._channels.set([]);
    this.db_channels._channel.set(null);
    await this.safeCall((): Promise<void> => this.db_auth.signOut(), undefined);
  }

  /**
   * Lädt ein einzelnes Profil asynchron anhand seiner ID.
   * @param {string} profileId - Die ID des Profils.
   * @returns {Promise<Profile | null>} Die Profildaten oder null.
   */
  public async getProfile(profileId: string): Promise<Profile | null> {
    return await this.safeCall(
      (): Promise<Profile | null> => this.db_profiles.getProfile(profileId),
      null,
    );
  }

  /**
   * Aktualisiert den Anzeigenamen eines bestehenden Profils.
   * @param {string} profileId - Die Profil-ID.
   * @param {string} value - Der neue Anzeigename.
   */
  public async editProfileName(profileId: string, value: string): Promise<void> {
    await this.safeCall(
      (): Promise<void> => this.db_profiles.updateProfileName(profileId, value.trim()),
      undefined,
    );
  }

  /**
   * Aktualisiert den Avatar des aktuellen Userprofils.
   * @param {string} value - Der neue Avatar.
   * @returns {Promise<void>}
   */
  public async editProfileAvatar(value: string): Promise<void> {
    await this.safeCall(
      (): Promise<void> => this.db_profiles.updateProfileAvatar(this.db_auth.getCurrentUserId(), value),
      undefined,
    );
  }

  /**
   * Gibt die ID des gemeinsamen Chats zwischen dem angemeldeten und einem anderen Benutzer zurück (erstellt bei Bedarf einen neuen).
   * @param {string} otherUserId - Die Profil-ID des Gesprächspartners.
   * @returns {Promise<string>} Die ID des Chats oder ein leerer string: "".
   */
  public async getChatId(otherUserId: string): Promise<string> {
    return await this.safeCall(
      (): Promise<string> => this.db_chats.getChatId(this.db_auth.getCurrentUserId(), otherUserId),
      '',
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
  public async newMsg(
    msgType: MsgType,
    threadChannelId: string | null,
    id: string,
    senderId: string,
    content: string,
  ): Promise<void> {
    await this.safeCall(
      (): Promise<void> =>
        this.db_messages.createNewMessage(
          msgType,
          threadChannelId,
          id.trim(),
          senderId.trim(),
          content.trim(),
        ),
      undefined,
    );
  }

  /**
   * Aktualisiert den Inhalt einer bestehenden Nachricht.
   * @param {string} msgId - Die Nachrichten-ID.
   * @param {string} newContent - Der neue Text.
   */
  public async editMsg(msgId: string, newContent: string): Promise<void> {
    await this.safeCall(
      (): Promise<void> => this.db_messages.updateMessage(msgId.trim(), newContent.trim()),
      undefined,
    );
  }

  /**
   * Lädt die Nachrichten für einen spezifischen Chat, Channel oder Thread in das jeweilige Signal.
   * @param {MsgType} msgType - Der Ziel-Typ.
   * @param {string} id - Die ID der Quelle.
   */
  public async loadMsg(msgType: MsgType, id: string): Promise<void> {
    await this.safeCall(
      (): Promise<void> => this.db_messages.getMessages(msgType, id.trim()),
      undefined,
    );
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
    return await this.safeCall(
      (): Promise<ReactionResult> =>
        this.db_messages.toggleReaction(msgId.trim(), senderId.trim(), emoji.trim().toLowerCase()),
      null,
    );
  }

  /**
   * Erstellt einen neuen Kanal und fügt den Ersteller als 'admin' hinzu.
   * @param {string} userId - Die Profil-ID des Erstellers.
   * @param {string} title - Der Name des Kanals.
   * @param {string} desc - Die Beschreibung des Kanals.
   * @returns {Promise<boolean>} - true bei Erfolg oder false bei einem Duplikat.
   */
  public async newChannel(userId: string, title: string, desc: string): Promise<boolean> {
    return await this.safeCall(
      (): Promise<boolean> =>
        this.db_channels.createNewChannel(userId.trim(), title.trim(), desc.trim()),
      false,
    );
  }

  /**
   * Aktualisiert den Namen und die Beschreibung eines bestehenden Kanals.
   * @param {string} channelId - Die Kanal-ID.
   * @param {string} title - Der neue Name.
   * @param {string} desc - Die neue Beschreibung.
   */
  public async editChannel(channelId: string, title: string, desc: string): Promise<void> {
    await this.safeCall(
      (): Promise<void> =>
        this.db_channels.updateChannelData(channelId.trim(), title.trim(), desc.trim()),
      undefined,
    );
  }

  /**
   * Fügt einen Benutzer als Admin-Mitglied zu einem Kanal hinzu.
   * @param {string} channelId - Die Kanal-ID.
   * @param {string} userId - Die Profil-ID des Benutzers.
   */
  public async addChannelMember(channelId: string, userId: string): Promise<void> {
    await this.safeCall(
      (): Promise<void> =>
        this.db_channels.createNewMember(channelId.trim(), userId.trim(), 'admin'),
      undefined,
    );
  }

  /**
   * Entfernt einen Benutzer aus einem Kanal.
   * @param {string} channelId - Die Kanal-ID.
   * @param {string} userId - Die Profil-ID des Benutzers.
   */
  public async removeChannelMember(channelId: string, userId: string): Promise<void> {
    await this.safeCall(
      (): Promise<void> => this.db_channels.removeMember(channelId.trim(), userId.trim()),
      undefined,
    );
  }

  /**
   * Lädt alle Kanäle, in denen ein Benutzer Mitglied ist, in das `channels` Signal.
   * @param {string} userId - Die Profil-ID des Benutzers.
   */
  public async getChannels(userId: string): Promise<void> {
    await this.safeCall(
      (): Promise<void> => this.db_channels.getChannelIds(userId.trim()),
      undefined,
    );
  }

  /**
   * Lädt die Detaildaten eines bestimmten Kanals in das `channel` Signal.
   * @param {string} channelId - Die Kanal-ID.
   */
  public async getChannelContent(channelId: string): Promise<void> {
    await this.safeCall(
      (): Promise<void> => this.db_channels.getChannelData(channelId.trim()),
      undefined,
    );
  }

  /**
   * Ermittelt die Thread-ID für eine Ursprungs-Nachricht. Erstellt bei Bedarf einen neuen Thread.
   * @param {string} messageId - Die ID der Ursprungs-Nachricht.
   * @returns {Promise<string>} Die ID des Threads.
   */
  public async getThreadId(messageId: string): Promise<string> {
    return await this.safeCall((): Promise<string> => this.db_threads.getThreadId(messageId), '');
  }
}

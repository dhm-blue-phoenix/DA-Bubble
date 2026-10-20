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
import { Messages, SearchMessages } from '../interfaces/messages';
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

  /** A read-only signal containing all user profiles. */
  public readonly profiles: Signal<Profiles> = this.db_profiles._profiles.asReadonly();
  /** A read-only signal containing the current user's login status (true/false). */
  public readonly isLogin: Signal<boolean> = this.db_auth._isUserLogin.asReadonly();
  /** A read-only signal containing the direct messages in the current view. */
  public readonly chatMsg: Signal<Messages> = this.db_messages._chat_messages.asReadonly();
  /** A read-only signal containing the messages in the current channel. */
  public readonly channelMsg: Signal<Messages> = this.db_messages._channel_messages.asReadonly();
  /** A read-only signal containing the messages in the current thread. */
  public readonly threadMsg: Signal<Messages> = this.db_messages._thread_messages.asReadonly();
  /** A read-only signal containing the IDs and names of channels the user belongs to. */
  public readonly channels: Signal<SignalChannels> = this.db_channels._channels.asReadonly();
  /** A read-only signal containing details for the currently open channel. */
  public readonly channel: Signal<SignalChannel> = this.db_channels._channel.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadProfiles();
      this.setupAuthListener();
    }
  }

  /**
   * Listens for authentication state changes from Supabase.
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
   * Handles sign-in.
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
   * Wraps operations in try/catch to avoid repeating error-handling code.
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
   * Loads all user profiles.
   */
  private async loadProfiles(): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_profiles.getProfiles(), undefined);
  }

  /**
   * Returns the ID of the currently signed-in user.
   * @returns {string} The profile ID, or an empty string.
   */
  public getCurrentUserId(): string {
    return this.db_auth.getCurrentUserId();
  }

  /**
   * Registers a new user.
   * @param {string} user_email - The email address.
   * @param {string} user_password - The password.
   * @param {string} user_name - The display name.
   * @param {string} user_avatar - The avatar URL or path.
   * @returns {Promise<boolean>} - `true` on success or `false` if the email is already registered.
   */
  public async register(
    user_email: string,
    user_password: string,
    user_name: string,
    user_avatar: string,
  ): Promise<false | void> {
    return await this.safeCall((): Promise<false | void> => this.db_auth.signUpNewUser(user_email.trim(), user_password.trim(), user_name.trim(), user_avatar.trim().toLowerCase()), false);
  }

  /**
   * Sends a password reset email.
   * @param {string} email - The user's email address.
   */
  public async sendEmailForPasswordReset(email: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_auth.resetPasswordForEmail(email), undefined);
  }

  /**
   * Updates the password of the currently signed-in user.
   * @param {string} newPassword - The new password.
   */
  public async updatePassword(newPassword: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_auth.changePassword(newPassword), undefined);
  }

  /**
   * Signs in an existing user.
   * @param {string} user_email - The email address.
   * @param {string} user_password - The password.
   */
 public async login(user_email: string, user_password: string): Promise<boolean> {
  return await this.safeCall(async (): Promise<boolean> => {
    await this.db_auth.signInWithEmail(user_email.trim(), user_password.trim());
    return true;
  }, false);
}

  /**
   * Signs in an existing user with their Google account.
   */
  public async loginWithGoogle(): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_auth.signInWithGoogle(), undefined);
  }

  /**
   * Signs out the current user and clears all cached signals.
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

  public async checkExistEmailForNewUser(email: string): Promise<boolean> {
    return await this.safeCall((): Promise<boolean> => this.db_auth.checkEmailExists(email), false);
  }

  /** Clears the cached messages for the current thread. */
  public clearThreadMessages(): void {
    this.db_messages._thread_messages.set([]);
  }

  /** Clears the cached messages for the current chat. */
  public clearChatMessages(): void {
    this.db_messages._chat_messages.set([]);
  }

  /**
   * Loads a profile asynchronously by its ID.
   * @param {string} profileId - The profile ID.
   * @returns {Promise<Profile | null>} The profile data, or null.
   */
  public async getProfile(profileId: string): Promise<Profile | null> {
    return await this.safeCall((): Promise<Profile | null> => this.db_profiles.getProfile(profileId), null);
  }

  /**
   * Updates the display name of an existing profile.
   * @param {string} profileId - The profile ID.
   * @param {string} value - The new display name.
   */
  public async editProfileName(profileId: string, value: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_profiles.updateProfileName(profileId, value.trim()), undefined);
  }

  /**
   * Updates the avatar of the current user's profile.
   * @param {string} value - The new avatar.
   * @returns {Promise<void>}
   */
  public async editProfileAvatar(value: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_profiles.updateProfileAvatar(this.db_auth.getCurrentUserId(), value), undefined);
  }

  /**
   * Returns the ID of the chat shared with another user, creating one if needed.
   * @param {string} otherUserId - The other user's profile ID.
   * @returns {Promise<string>} The chat ID, or an empty string.
   */
  public async getChatId(otherUserId: string): Promise<string> {
    return await this.safeCall((): Promise<string> => this.db_chats.getChatId(this.db_auth.getCurrentUserId(), otherUserId), '');
  }

  /**
   * Creates a message in a chat, channel, or thread.
   * @param {MsgType} msgType - The target type ('chat', 'channel', or 'thread').
   * @param {string | null} threadChannelId - The parent channel ID for a thread, or null.
   * @param {string} id - The target chat, channel, or thread ID.
   * @param {string} senderId - The sender's profile ID.
   * @param {string} content - The message text.
   */
  public async newMsg( msgType: MsgType, threadChannelId: string | null, id: string, senderId: string, content: string): Promise<void> {
    if (msgType === 'channel') {
      const user = this.channel()?.channel_members.find(member => member.user_id === senderId);
      if (!user) throw new Error(`User is not in this channel.`);
    }
    await this.safeCall((): Promise<void> => this.db_messages.createNewMessage( msgType, threadChannelId, id.trim(), senderId.trim(), content.trim()), undefined);
  }

  /**
   * Updates the content of an existing message.
   * @param {string} msgId - The message ID.
   * @param {string} newContent - The new text.
   */
  public async editMsg(msgId: string, newContent: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_messages.updateMessage(msgId.trim(), newContent.trim()), undefined);
  }

  /**
   * Loads messages for a specific chat, channel, or thread into its signal.
   * @param {MsgType} msgType - The target type.
   * @param {string} id - The source ID.
   */
  public async loadMsg(msgType: MsgType, id: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_messages.getMessages(msgType, id.trim()), undefined);
  }

  /**
   * Searches all messages for a term and returns the results.
   * @param {string} value - The search term.
   * @returns {Promise<SearchMessages>} The matching messages, or an empty array.
   */
  public async searchMsg(value: string): Promise<SearchMessages> {
    return await this.safeCall((): Promise<SearchMessages> => this.db_messages.searchMessages(value), []);
  }

  /**
   * Adds an emoji reaction or removes it if the same user has already added it.
   * @param {string} msgId - The message ID.
   * @param {string} senderId - The reacting user's profile ID.
   * @param {string} emoji - The emoji.
   * @returns {Promise<ReactionResult>} The action result ('added' or 'removed').
   */
  public async toggleReaction(
    msgId: string,
    senderId: string,
    emoji: string,
  ): Promise<ReactionResult | null> {
    return await this.safeCall((): Promise<ReactionResult> => this.db_messages.toggleReaction(msgId.trim(), senderId.trim(), emoji.trim().toLowerCase()), null);
  }

  /**
   * Creates a channel and adds its creator as an 'admin'.
   * @param {string} userId - The creator's profile ID.
   * @param {string} title - The channel name.
   * @param {string} desc - The channel description.
   * @returns {Promise<boolean>} - `true` on success or `false` if a duplicate exists.
   */
  public async newChannel(userId: string, title: string, desc: string): Promise<boolean> {
    return await this.safeCall((): Promise<boolean> => this.db_channels.createNewChannel(userId.trim(), title.trim(), desc.trim()), false);
  }

  /**
   * Updates the name and description of an existing channel.
   * @param {string} channelId - The channel ID.
   * @param {string} title - The new name.
   * @param {string} desc - The new description.
   */
  public async editChannel(channelId: string, title: string, desc: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_channels.updateChannelData(channelId.trim(), title.trim(), desc.trim()), undefined);
  }

  /**
   * Adds a user to a channel as an admin member.
   * @param {string} channelId - The channel ID.
   * @param {string} userId - The user's profile ID.
   */
  public async addChannelMember(channelId: string, userId: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_channels.createNewMember(channelId.trim(), userId.trim(), 'admin'), undefined);
  }

  /**
   * Removes a user from a channel.
   * @param {string} channelId - The channel ID.
   * @param {string} userId - The user's profile ID.
   */
  public async removeChannelMember(channelId: string, userId: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_channels.removeMember(channelId.trim(), userId.trim()), undefined);
  }

  /**
   * Loads all channels the user belongs to into the `channels` signal.
   * @param {string} userId - The user's profile ID.
   */
  public async getChannels(userId: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_channels.getChannelIds(userId.trim()), undefined);
  }

  /**
   * Loads the details of a channel into the `channel` signal.
   * @param {string} channelId - The channel ID.
   */
  public async getChannelContent(channelId: string): Promise<void> {
    await this.safeCall((): Promise<void> => this.db_channels.getChannelData(channelId.trim()), undefined);
  }

  /**
   * Gets the thread ID for a root message, creating a thread if needed.
   * @param {string} messageId - The root message ID.
   * @returns {Promise<string>} The thread ID.
   */
  public async getThreadId(messageId: string): Promise<string> {
    return await this.safeCall((): Promise<string> => this.db_threads.getThreadId(messageId), '');
  }
}

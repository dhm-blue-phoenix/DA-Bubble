import { inject, Injectable } from '@angular/core';

import { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';
import { DatabaseAuth } from './db-auth';

import { Message } from '../../interfaces/messages';
import { SenderId, SenderIds } from '../../interfaces/chats';

@Injectable({
  providedIn: 'root',
})
export class DatabaseMessageHelper {
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly db_auth: DatabaseAuth = inject(DatabaseAuth);

  /**
   * Checks whether a message belongs to the currently open chat.
   * @param {string} chatId - The ID of the currently open chat.
   * @param {Message} message - The message to check.
   * @returns {boolean} True if the message belongs to the chat.
   */
  public checkChat(chatId: string, message: Message): boolean {
    return chatId === message['chat_id'];
  }

  /**
   * Checks whether the current user is a recipient of a chat, channel, or thread message
   * and displays a browser notification when appropriate.
   * @param {Message} message - The incoming message.
   * @returns {Promise<void>}
   */
  /**
   * Checks whether the current user is a recipient of a chat, channel, or thread message
   * and displays a browser notification when appropriate.
   * @param {Message} message - The incoming message.
   * @returns {Promise<void>}
   */
  public async checkCurrentChat(message: Message): Promise<void> {
    if (!message) return;
    const currentUserId = this.db_auth.getCurrentUserId();
    if (!currentUserId) {
      return;
    }
    if (message['sender_id'] === currentUserId) {
      return;
    }

    let channelId = message['channel_id'];
    let chatId = message['chat_id'];

    if (!channelId && !chatId && message['thread_id']) {
      const { data: threadData } = await this.supabase
        .from('threads')
        .select('channel_id, chat_id')
        .eq('id', message['thread_id'])
        .maybeSingle();
      if (threadData) {
        channelId = threadData.channel_id;
        chatId = threadData.chat_id;
      }
    }

    if (chatId) {
      const { data, error }: PostgrestSingleResponse<SenderIds> = await this.supabase
        .from('chat_members')
        .select('user_id')
        .eq('chat_id', chatId);
      if (error || !data) return;
      const isMember: boolean = data.some(
        (member: SenderId): boolean => member['user_id'] === currentUserId,
      );
      if (isMember) {
        const title: string = message['thread_id'] ? 'Neue Thread-Antwort' : 'Neue Nachricht';
        await this.setBrowserNotification(title, message['content']);
      }
    } else if (channelId) {
      const { data, error }: PostgrestSingleResponse<SenderIds> = await this.supabase
        .from('channel_members')
        .select('user_id')
        .eq('channel_id', channelId);
      if (error || !data) return;
      const isMember: boolean = data.some(
        (member: SenderId): boolean => member['user_id'] === currentUserId,
      );
      if (isMember) {
        const title: string = message['thread_id'] ? 'Neue Thread-Antwort' : 'Neue Kanal-Nachricht';
        await this.setBrowserNotification(title, message['content']);
      }
    }
  }

  /**
   * Requests permission to display browser notifications.
   * @returns {Promise<NotificationPermission>} The current permission status.
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[Notification] Browser supports no Notifications.');
      return 'denied';
    }
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return Notification.permission;
  }

  /**
   * Checks notification permission and displays a browser notification.
   * @param {string} title - The notification title.
   * @param {string} description - The notification body.
   * @returns {Promise<void>}
   */
  public async setBrowserNotification(title: string, description: string): Promise<void> {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      this.sendPushNotification(title, description);
    } else {
      console.warn(
        `[Notification] Permission state is '${Notification.permission}'. Notification was not shown.`,
      );
    }
  }

  /**
   * Creates and displays a browser push notification.
   * Clicking the notification focuses the browser window.
   * @param {string} title - The notification title.
   * @param {string} description - The notification body.
   * @returns {void}
   */
  private sendPushNotification(title: string, description: string): void {
    const notification = new Notification(title, {
      body: description,
      icon: 'assets/svg/logo/Logo.svg',
    });
    notification.onclick = (): void => {
      window.focus();
    };
  }
}

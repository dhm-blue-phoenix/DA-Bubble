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
   * Prüft, ob eine Nachricht zum aktuell geöffneten Chat gehört.
   * @param {string} chatId - Die ID des aktuell geöffneten Chats.
   * @param {Message} message - Die zu prüfende Nachricht.
   * @returns {boolean} True wenn die Nachricht zum Chat gehört.
   */
  public checkChat(chatId: string, message: Message): boolean {
    return chatId === message['chat_id'];
  }

  /**
   * Prüft, ob der aktuelle Benutzer Empfänger einer Chat-, Kanal- oder Thread-Nachricht ist
   * und zeigt bei Bedarf eine Browser-Benachrichtigung an.
   * @param {Message} message - Die eingegangene Nachricht.
   * @returns {Promise<void>}
   */
  /**
   * Prüft, ob der aktuelle Benutzer Empfänger einer Chat-, Kanal- oder Thread-Nachricht ist
   * und zeigt bei Bedarf eine Browser-Benachrichtigung an.
   * @param {Message} message - Die eingegangene Nachricht.
   * @returns {Promise<void>}
   */
  public async checkCurrentChat(message: Message): Promise<void> {
    if (!message) return;
    const currentUserId = this.db_auth.getCurrentUserId();
    if (!currentUserId) {
      console.log('[Notification] Skipped: No current user logged in.');
      return;
    }
    if (message['sender_id'] === currentUserId) {
      console.log('[Notification] Skipped: Message was sent by self.');
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
      } else {
        console.log('[Notification] Skipped: User is not a member of chat', chatId);
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
      } else {
        console.log('[Notification] Skipped: User is not a member of channel', channelId);
      }
    }
  }

  /**
   * Fordert die Browser-Benachrichtigungs-Berechtigung an.
   * @returns {Promise<NotificationPermission>} Der aktuellen Berechtigungsstatus.
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[Notification] Browser supports no Notifications.');
      return 'denied';
    }
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('[Notification] Requested permission result:', permission);
      return permission;
    }
    return Notification.permission;
  }

  /**
   * Prüft die Benachrichtigungs-Berechtigung und zeigt eine Browser-Notification an.
   * @param {string} title - Der Titel der Benachrichtigung.
   * @param {string} description - Der Inhalt der Benachrichtigung.
   * @returns {Promise<void>}
   */
  public async setBrowserNotification(title: string, description: string): Promise<void> {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      console.log(`[Notification] Triggering notification: "${title}" - "${description}"`);
      this.sendPushNotification(title, description);
    } else {
      console.warn(
        `[Notification] Permission state is '${Notification.permission}'. Notification was not shown.`,
      );
    }
  }

  /**
   * Erstellt und zeigt eine Browser Push-Notification an.
   * Bei Klick auf die Notification wird das Browser-Fenster fokussiert.
   * @param {string} title - Der Titel der Benachrichtigung.
   * @param {string} description - Der Inhalt der Benachrichtigung.
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

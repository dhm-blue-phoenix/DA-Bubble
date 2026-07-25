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
   * Prüft, ob der aktuelle Benutzer Empfänger einer Chat-Nachricht ist
   * und zeigt bei Bedarf eine Browser-Benachrichtigung an.
   * @param {Message} message - Die eingegangene Nachricht.
   * @returns {Promise<void>}
   */
  public async checkCurrentChat(message: Message): Promise<void> {
    const { data, error }: PostgrestSingleResponse<SenderIds> = await this.supabase
      .from('chat_members')
      .select('user_id')
      .eq('chat_id', message['chat_id']);

    if (error) throw new Error(`[ DB_CODE:${error.code} ] MSG: ${error.message}`);
    if (!data) throw new Error('DB_SERVICE: No such chat');

    const recipient: SenderId | undefined = data.find((chat: SenderId): boolean => {
      return chat['user_id'] != message['sender_id'];
    });
    if (recipient && recipient['user_id'] === this.db_auth.getCurrentUserId()) {
      await this.setBrowserNotification('Neue Nachricht', message['content']);
    }
  }

  /**
   * Prüft die Benachrichtigungs-Berechtigung und zeigt eine Browser-Notification an.
   * Wirft einen Fehler, wenn der Browser keine Notifications unterstützt.
   * @param {string} title - Der Titel der Benachrichtigung.
   * @param {string} description - Der Inhalt der Benachrichtigung.
   * @returns {Promise<void>}
   */
  public async setBrowserNotification(title: string, description: string): Promise<void> {
    if (!('Notification' in window)) throw new Error('Browser Notifications are not supported!');
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      this.sendPushNotification(title, description);
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

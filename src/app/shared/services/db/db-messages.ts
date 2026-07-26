import { inject, Injectable, OnDestroy, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';
import { DatabaseMessageHelper } from './db-message-helper';

import { Message, Messages, Reaction } from '../../interfaces/messages';
import { MsgType, NewMessage, ReactionResult } from '../../interfaces/db/db-messages';
import { DbPostgrestError } from '../../interfaces/db-error';

@Injectable({
  providedIn: 'root',
})
export class DatabaseMessages implements OnDestroy {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly db_msg_helper: DatabaseMessageHelper = inject(DatabaseMessageHelper);
  private readonly channels?: RealtimeChannel;

  /** Signal für direkte Chat-Nachrichten */
  public readonly _chat_messages: WritableSignal<Messages> = signal<Messages>([]);
  /** Signal für Kanal-Nachrichten */
  public readonly _channel_messages: WritableSignal<Messages> = signal<Messages>([]);
  /** Signal für Thread-Nachrichten */
  public readonly _thread_messages: WritableSignal<Messages> = signal<Messages>([]);

  public currentChatId: string = '';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.channels = this.subscribeMessages();
    }
  }

  /**
   * Abonnierte Realtime-Events für die Nachrichten- und Reaktions-Tabellen.
   * @returns {RealtimeChannel} Der abonnierte Realtime-Kanal.
   */
  private subscribeMessages(): RealtimeChannel {
    return this.supabase
      .channel('realtime:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload: RealtimePostgresChangesPayload<object>): void => this.handleMessageEvent(payload),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        (payload: RealtimePostgresChangesPayload<object>): void => this.handleMessageEvent(payload),
      )
      .subscribe();
  }

  /**
   * Verteilt ein kommendes Realtime-Event für Nachrichten und Reaktionen.
   * @param {RealtimePostgresChangesPayload<object>} payload - Das Event-Payload.
   */
  private handleMessageEvent(payload: RealtimePostgresChangesPayload<object>): void {
    const { table, eventType }: { table: string; eventType: string } = payload;
    if (table === 'messages') {
      if (eventType === 'INSERT') this.insertEventMessage(payload);
      if (eventType === 'UPDATE') this.updateEventMessage(payload);
    }
    if (table === 'reactions') {
      if (eventType === 'INSERT') this.insertEventReaction(payload);
      if (eventType === 'DELETE') this.deleteEventReaction(payload);
    }
  }

  /**
   * Behandelt ein INSERT-Event für Nachrichten und aktualisiert des passenden Signals.
   * @param {RealtimePostgresChangesPayload<object>} payload - Das Event-Payload.
   */
  private async insertEventMessage(payload: RealtimePostgresChangesPayload<object>): Promise<void> {
    const message: Message = payload.new as Message;
    if (message.chat_id && this.db_msg_helper.checkChat(this.currentChatId, message)) {
      this._chat_messages.update(
        (list: Messages): Messages => this.eventHelperInsertMessage(list, message),
      );
    }
    if (message.channel_id)
      this._channel_messages.update(
        (list: Messages): Messages => this.eventHelperInsertMessage(list, message),
      );
    if (message.thread_id)
      this._thread_messages.update(
        (list: Messages): Messages => this.eventHelperInsertMessage(list, message),
      );
    this.db_msg_helper.checkCurrentChat(message);
  }

  /**
   * Hilfsfunktion zum Einfügen einer Nachricht in eine Liste (falls noch nicht vorhanden).
   * @param {Messages} list - Die aktuelle Liste an Nachrichten.
   * @param {Message} message - Die neu einzufügende Nachricht.
   * @returns {Messages} Die aktualisierte Nachrichtenliste.
   */
  private eventHelperInsertMessage(list: Messages, message: Message): Messages {
    return list.some((msg: Message): boolean => msg['id'] === message['id'])
      ? list
      : [...list, message];
  }

  /**
   * Behandelt ein UPDATE-Event für Nachrichten und aktualisiert die passenden Signals.
   * @param {RealtimePostgresChangesPayload<object>} payload - Das Event-Payload.
   */
  private updateEventMessage(payload: RealtimePostgresChangesPayload<object>): void {
    const message: Message = payload.new as Message;
    if (message.chat_id)
      this._chat_messages.update(
        (list: Messages): Messages => this.eventHelperUpdateMessage(list, message),
      );
    if (message.channel_id)
      this._channel_messages.update(
        (list: Messages): Messages => this.eventHelperUpdateMessage(list, message),
      );
    if (message.thread_id)
      this._thread_messages.update(
        (list: Messages): Messages => this.eventHelperUpdateMessage(list, message),
      );
  }

  /**
   * Hilfsfunktion zum Aktualisieren einer spezifischen Nachricht in einer Liste.
   * @param {Messages} list - Die aktuelle Liste an Nachrichten.
   * @param {Message} message - Die aktualisierte Nachricht.
   * @returns {Messages} Die aktualisierte Nachrichtenliste.
   */
  private eventHelperUpdateMessage(list: Messages, message: Message): Messages {
    return list.map((msg: Message): Message => (msg['id'] === message['id'] ? message : msg));
  }

  /**
   * Behandelt ein INSERT-Event für eine Reaktion und fügt diese der richtigen Nachricht hinzu.
   * @param {RealtimePostgresChangesPayload<object>} payload - Das Event-Payload.
   */
  private insertEventReaction(payload: RealtimePostgresChangesPayload<object>): void {
    const reaction = payload.new as Reaction;
    if (this.eventHelperIsMsgType(reaction) === 'chat')
      this._chat_messages.update(
        (list: Messages): Messages => this.eventHelperInsertReaction(list, reaction),
      );
    if (this.eventHelperIsMsgType(reaction) === 'channel')
      this._channel_messages.update(
        (list: Messages): Messages => this.eventHelperInsertReaction(list, reaction),
      );
    if (this.eventHelperIsMsgType(reaction) === 'thread')
      this._thread_messages.update(
        (list: Messages): Messages => this.eventHelperInsertReaction(list, reaction),
      );
  }

  /**
   * Hilfsfunktion zum Einfügen einer Reaktion in die zugehörige Nachricht.
   * @param {Messages} list - Die Nachrichtenliste.
   * @param {Reaction} reaction - Die neue Reaktion.
   * @returns {Messages} Die aktualisierte Nachrichtenliste.
   */
  private eventHelperInsertReaction(list: Messages, reaction: Reaction): Messages {
    return list.map(
      (msg: Message): Message =>
        msg.id === reaction['message_id']
          ? { ...msg, reactions: [...msg['reactions'], reaction] }
          : msg,
    );
  }

  /**
   * Behandelt ein DELETE-Event für eine Reaktion und entfernt diese aus der Nachricht.
   * @param {RealtimePostgresChangesPayload<object>} payload - Das Event-Payload.
   */
  private deleteEventReaction(payload: RealtimePostgresChangesPayload<object>): void {
    const reaction = payload.old as Reaction;
    if (this.eventHelperIsMsgType(reaction) === 'chat')
      this._chat_messages.update(
        (list: Messages): Messages => this.eventHelperDeleteReaction(list, reaction),
      );
    if (this.eventHelperIsMsgType(reaction) === 'channel')
      this._channel_messages.update(
        (list: Messages): Messages => this.eventHelperDeleteReaction(list, reaction),
      );
    if (this.eventHelperIsMsgType(reaction) === 'thread')
      this._thread_messages.update(
        (list: Messages): Messages => this.eventHelperDeleteReaction(list, reaction),
      );
  }

  /**
   * Hilfsfunktion zum Löschen einer Reaktion aus der zugehörigen Nachricht.
   * @param {Messages} list - Die Nachrichtenliste.
   * @param {Reaction} reaction - Die zu löschende Reaktion.
   * @returns {Messages} Die aktualisierte Nachrichtenliste.
   */
  private eventHelperDeleteReaction(list: Messages, reaction: Reaction): Messages {
    return list.map(
      (msg: Message): Message =>
        msg.id === reaction.message_id
          ? {
              ...msg,
              reactions: msg.reactions.filter(
                (r: Reaction): boolean =>
                  !(r.user_id === reaction.user_id && r.emoji === reaction.emoji),
              ),
            }
          : msg,
    );
  }

  /**
   * Bestimmt den Nachrichtentyp (Chat, Channel, Thread) anhand einer Reaktion.
   * @param {Reaction} reaction - Die überprüfte Reaktion.
   * @returns {string} Der gefundene Nachrichtentyp oder 'none'.
   */
  private eventHelperIsMsgType(reaction: Reaction): string {
    const isChat: boolean = this._chat_messages().some((list: Message): boolean => {
      return list['id'] === reaction['message_id'];
    });
    const isChannel: boolean = this._channel_messages().some((list: Message): boolean => {
      return list['id'] === reaction['message_id'];
    });
    const isThread: boolean = this._thread_messages().some((list: Message): boolean => {
      return list['id'] === reaction['message_id'];
    });
    return (isChat && 'chat') || (isChannel && 'channel') || (isThread && 'thread') || 'none';
  }

  /** Beendet die Realtime-Verbindung beim Zerstören des Services. */
  public ngOnDestroy(): void {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  /**
   * Lädt Nachrichten für einen spezifischen Chat, Channel oder Thread.
   * @param {MsgType} msgType - Der Typ der Nachrichtenquelle ('chat', 'channel' oder 'thread').
   * @param {string} id - Die ID der Quelle (chat_id, channel_id oder thread_id).
   * @returns {Promise<void>}
   */
  public async getMessages(msgType: MsgType, id: string): Promise<void> {
    this.currentChatId = id;
    const { data: messages, error }: PostgrestResponse<any> = await this.supabase
      .from('messages')
      .select(
        `
        id,
        content,
        created_at,
        edited_at,
        sender_id,
        reactions(emoji, user_id),
        threads!threads_root_message_id_fkey(id)
      `,
      )
      .eq(msgType + '_id', id)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    if (messages) {
      if (msgType === 'chat') this._chat_messages.set(messages);
      if (msgType === 'channel') this._channel_messages.set(messages);
      if (msgType === 'thread') this._thread_messages.set(messages);
    }
  }

  /**
   * Aktualisiert den Textinhalt einer bestehenden Nachricht.
   * @param {string} messageId - Die ID der Nachricht.
   * @param {string} newContent - Der neue Text.
   * @returns {Promise<void>}
   */
  public async updateMessage(messageId: string, newContent: string): Promise<void> {
    const { error }: PostgrestSingleResponse<DbPostgrestError> = await this.supabase
      .from('messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Erstellt eine neue Nachricht in der Datenbank.
   * @param {MsgType} msgType - Der Ziel-Typ ('chat', 'channel' oder 'thread').
   * @param {string | null} threadChannelId - Optional die Kanal-ID, falls es sich um eine Thread-Nachricht handelt.
   * @param {string} id - Die ID des Chats, Kanals oder Threads.
   * @param {string} senderId - Die Profil-ID des Absenders.
   * @param {string} content - Der Nachrichtentext.
   * @returns {Promise<void>}
   */
  public async createNewMessage(
    msgType: MsgType,
    threadChannelId: string | null,
    id: string,
    senderId: string,
    content: string,
  ): Promise<void> {
    const mt: string = msgType + '_id';
    const newMessage: NewMessage = {
      [mt]: id,
      sender_id: senderId,
      content: content,
    };
    const { error }: PostgrestSingleResponse<DbPostgrestError> = await this.supabase
      .from('messages')
      .insert(this.returnMsgType(msgType, threadChannelId, newMessage))
      .select()
      .single();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Hilfsfunktion zum Ergänzen der channel_id bei Thread-Nachrichten.
   * @param {MsgType} msgType - Der Ziel-Typ.
   * @param {string | null} threadChannelId - Die ID des zugehörigen Kanals.
   * @param {NewMessage} newMessage - Das rudimentäre Nachrichtenobjekt.
   * @returns {NewMessage} Das fertige Nachrichtenobjekt zum Einfügen.
   */
  private returnMsgType(
    msgType: MsgType,
    threadChannelId: string | null,
    newMessage: NewMessage,
  ): NewMessage {
    return msgType === 'thread'
      ? { ...newMessage, channel_id: threadChannelId as string }
      : newMessage;
  }

  /**
   * Prüft, ob ein Benutzer bereits mit einem bestimmten Emoji auf eine Nachricht reagiert hat.
   * @param {string} messageId - Die ID der Nachricht.
   * @param {string} userId - Die ID des Benutzers.
   * @param {string} emoji - Das geprüfte Emoji.
   * @returns {Promise<boolean>} True, wenn die Reaktion existiert, sonst false.
   */
  private async checkExistReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<boolean> {
    const { data, error }: PostgrestSingleResponse<any> = await this.supabase
      .from('reactions')
      .select('*')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    return !!data;
  }

  /**
   * Löscht eine spezifische Emoji-Reaktion aus der Datenbank.
   * @param {string} messageId - Die ID der Nachricht.
   * @param {string} userId - Die ID des Benutzers.
   * @param {string} emoji - Das zu löschende Emoji.
   * @returns {Promise<ReactionResult>} Das Ergebnis mit der Aktion 'removed'.
   */
  private async deleteReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ReactionResult> {
    const { error }: PostgrestSingleResponse<PostgrestError | null> = await this.supabase
      .from('reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    return { action: 'removed' };
  }

  /**
   * Fügt eine neue Emoji-Reaktion in die Datenbank ein.
   * @param {string} messageId - Die ID der Nachricht.
   * @param {string} userId - Die ID des Benutzers.
   * @param {string} emoji - Das neue Emoji.
   * @returns {Promise<ReactionResult>} Das Ergebnis mit der Aktion 'added'.
   */
  private async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ReactionResult> {
    const { error }: PostgrestSingleResponse<DbPostgrestError> = await this.supabase
      .from('reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji: emoji,
      })
      .select()
      .single();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    return { action: 'added' };
  }

  /**
   * Schaltet eine Reaktion um (Toggelt): Ist sie vorhanden, wird sie entfernt. Ist sie nicht vorhanden, wird sie hinzugefügt.
   * @param {string} messageId - Die ID der Nachricht.
   * @param {string} userId - Die ID des Benutzers.
   * @param {string} emoji - Das umzuschaltende Emoji.
   * @returns {Promise<ReactionResult>} Ein Promise, das 'added' oder 'removed' zurückgibt.
   */
  public async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ReactionResult> {
    if (await this.checkExistReaction(messageId, userId, emoji)) {
      return await this.deleteReaction(messageId, userId, emoji);
    } else {
      return await this.addReaction(messageId, userId, emoji);
    }
  }
}

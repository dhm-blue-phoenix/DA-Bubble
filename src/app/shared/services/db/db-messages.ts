import { inject, Injectable, OnDestroy, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { PostgrestError, PostgrestResponse, PostgrestSingleResponse, RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient} from '@supabase/supabase-js';
import { Supabase } from './db-superbase';
import { DatabaseMessageHelper } from './db-message-helper';
import { DatabaseThreads } from './db-threads';

import { Message, Messages, Reaction, SearchMessages } from '../../interfaces/messages';
import { MsgType, NewMessage, ReactionResult } from '../../interfaces/db/db-messages';
import { DbPostgrestError } from '../../interfaces/db-error';

@Injectable({
  providedIn: 'root',
})
export class DatabaseMessages implements OnDestroy {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly db_msg_helper: DatabaseMessageHelper = inject(DatabaseMessageHelper);
  private readonly db_threads: DatabaseThreads = inject(DatabaseThreads);
  private readonly channels?: RealtimeChannel;

  /** Signal for direct chat messages. */
  public readonly _chat_messages: WritableSignal<Messages> = signal<Messages>([]);
  /** Signal for channel messages. */
  public readonly _channel_messages: WritableSignal<Messages> = signal<Messages>([]);
  /** Signal for thread messages. */
  public readonly _thread_messages: WritableSignal<Messages> = signal<Messages>([]);

  public currentChatId: string = '';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.channels = this.subscribeMessages();
    }
  }

  /**
   * Subscribes to Realtime events for the messages and reactions tables.
   * @returns {RealtimeChannel} The subscribed Realtime channel.
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
   * Routes incoming Realtime events for messages and reactions.
   * @param {RealtimePostgresChangesPayload<object>} payload - The event payload.
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
   * Handles a message INSERT event and updates the corresponding signal.
   * @param {RealtimePostgresChangesPayload<object>} payload - The event payload.
   */
  private async insertEventMessage(payload: RealtimePostgresChangesPayload<object>): Promise<void> {
    const message: Message = payload.new as Message;
    if (message.chat_id && this.db_msg_helper.checkChat(this.currentChatId, message)) {
      this._chat_messages.update(
        (list: Messages): Messages => this.eventHelperInsertMessage(list, message),
      );
    }
    if (message.channel_id && !message.thread_id)
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
   * Adds a message to a list if it is not already present.
   * @param {Messages} list - The current message list.
   * @param {Message} message - The message to add.
   * @returns {Messages} The updated message list.
   */
  private eventHelperInsertMessage(list: Messages, message: Message): Messages {
    return list.some((msg: Message): boolean => msg['id'] === message['id'])
      ? list
      : [...list, { ...message, reactions: message['reactions'] ?? [] }];
  }

  /**
   * Handles a message UPDATE event and updates the corresponding signal.
   * @param {RealtimePostgresChangesPayload<object>} payload - The event payload.
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
   * Updates a specific message in a list.
   * @param {Messages} list - The current message list.
   * @param {Message} message - The updated message.
   * @returns {Messages} The updated message list.
   */
  private eventHelperUpdateMessage(list: Messages, message: Message): Messages {
    return list.map(
      (msg: Message): Message => (msg['id'] === message['id'] ? { ...msg, ...message } : msg),
    );
  }

  /**
   * Handles a reaction INSERT event and adds it to the corresponding message.
   * @param {RealtimePostgresChangesPayload<object>} payload - The event payload.
   */
  private insertEventReaction(payload: RealtimePostgresChangesPayload<object>): void {
    const reaction = payload.new as Reaction;
    this._chat_messages.update(
      (list: Messages): Messages => this.eventHelperInsertReaction(list, reaction),
    );
    this._channel_messages.update(
      (list: Messages): Messages => this.eventHelperInsertReaction(list, reaction),
    );
    this._thread_messages.update(
      (list: Messages): Messages => this.eventHelperInsertReaction(list, reaction),
    );
  }

  /**
   * Adds a reaction to its corresponding message.
   * @param {Messages} list - The message list.
   * @param {Reaction} reaction - The new reaction.
   * @returns {Messages} The updated message list.
   */
  private eventHelperInsertReaction(list: Messages, reaction: Reaction): Messages {
    return list.map((msg: Message): Message => msg.id === reaction['message_id'] ? { ...msg, reactions: [...(msg['reactions'] || []), reaction] } : msg);
  }

  /**
   * Handles a reaction DELETE event and removes it from the message.
   * @param {RealtimePostgresChangesPayload<object>} payload - The event payload.
   */
  private deleteEventReaction(payload: RealtimePostgresChangesPayload<object>): void {
    const reaction = payload.old as Reaction;
    this._chat_messages.update(
      (list: Messages): Messages => this.eventHelperDeleteReaction(list, reaction),
    );
    this._channel_messages.update(
      (list: Messages): Messages => this.eventHelperDeleteReaction(list, reaction),
    );
    this._thread_messages.update(
      (list: Messages): Messages => this.eventHelperDeleteReaction(list, reaction),
    );
  }

  /**
   * Removes a reaction from its corresponding message.
   * @param {Messages} list - The message list.
   * @param {Reaction} reaction - The reaction to remove.
   * @returns {Messages} The updated message list.
   */
  private eventHelperDeleteReaction(list: Messages, reaction: Reaction): Messages {
    return list.map(
      (msg: Message): Message =>
        msg.id === reaction.message_id
          ? {
              ...msg,
              reactions: (msg.reactions || []).filter(
                (r: Reaction): boolean =>
                  !(r.user_id === reaction.user_id && r.emoji === reaction.emoji),
              ),
            }
          : msg,
    );
  }

  /** Closes the Realtime connection when the service is destroyed. */
  public ngOnDestroy(): void {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  /**
   * Loads messages for a specific chat, channel, or thread.
   * @param {MsgType} msgType - The source type ('chat', 'channel', or 'thread').
   * @param {string} id - The source ID (chat_id, channel_id, or thread_id).
   * @returns {Promise<void>}
   */
  public async getMessages(msgType: MsgType, id: string): Promise<void> {
    this.currentChatId = id;
    let query = this.supabase
      .from('messages')
      .select(`id, content, created_at, edited_at, sender_id, reactions(emoji, user_id), threads!threads_root_message_id_fkey(id)`)
      .eq(msgType + '_id', id);
    if (msgType === 'channel') query = query.is('thread_only', null);
    const { data: messages, error }: PostgrestResponse<any> = await query.order('created_at', { ascending: true });
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    if (messages) {
      const enrichedMessages = await this.attachReplyCounts(messages);
      if (msgType === 'chat') this._chat_messages.set(enrichedMessages);
      if (msgType === 'channel') this._channel_messages.set(enrichedMessages);
      if (msgType === 'thread') this._thread_messages.set(enrichedMessages);
    }
  }

  /**
   * Adds the number of replies to messages that have a thread.
   * @param {any[]} messages - The loaded messages.
   * @returns {Promise<any[]>} The messages, with `replyCount` added when a thread exists.
   */
  private async attachReplyCounts(messages: any[]): Promise<any[]> {
    return Promise.all(
      messages.map(async (message) => {
        const threadId = message.threads?.id;
        if (!threadId) return message;
        const replyCount = await this.db_threads.getThreadMessageCount(threadId);
        return { ...message, replyCount };
      }),
    );
  }

  /**
   * Updates the text of an existing message.
   * @param {string} messageId - The message ID.
   * @param {string} newContent - The new text.
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
   * Creates a message in the database.
   * @param {MsgType} msgType - The target type ('chat', 'channel', or 'thread').
   * @param {string | null} threadChannelId - The channel ID for a thread message, if applicable.
   * @param {string} id - The chat, channel, or thread ID.
   * @param {string} senderId - The sender's profile ID.
   * @param {string} content - The message text.
   * @returns {Promise<void>}
   */
  public async createNewMessage(msgType: MsgType, threadChannelId: string | null, id: string, senderId: string, content: string): Promise<void> {
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
   * Adds the `channel_id` to thread messages.
   * @param {MsgType} msgType - The target type.
   * @param {string | null} threadChannelId - The associated channel ID.
   * @param {NewMessage} newMessage - The base message object.
   * @returns {NewMessage} The complete message object to insert.
   */
  private returnMsgType(msgType: MsgType, threadChannelId: string | null, newMessage: NewMessage): NewMessage {
    return msgType === 'thread'
      ? { ...newMessage, channel_id: threadChannelId as string, thread_only: true }
      : newMessage;
  }

  /**
   * Checks whether a user has already reacted to a message with a specific emoji.
   * @param {string} messageId - The message ID.
   * @param {string} userId - The user ID.
   * @param {string} emoji - The emoji to check.
   * @returns {Promise<boolean>} True if the reaction exists; otherwise, false.
   */
  private async checkExistReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
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
   * Deletes a specific emoji reaction from the database.
   * @param {string} messageId - The message ID.
   * @param {string} userId - The user ID.
   * @param {string} emoji - The emoji to remove.
   * @returns {Promise<ReactionResult>} The result with the action `removed`.
   */
  private async deleteReaction(messageId: string, userId: string, emoji: string): Promise<ReactionResult> {
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
   * Adds a new emoji reaction to the database.
   * @param {string} messageId - The message ID.
   * @param {string} userId - The user ID.
   * @param {string} emoji - The new emoji.
   * @returns {Promise<ReactionResult>} The result with the action `added`.
   */
  private async addReaction(messageId: string, userId: string, emoji: string): Promise<ReactionResult> {
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
   * Toggles a reaction: removes it if it exists, or adds it otherwise.
   * @param {string} messageId - The message ID.
   * @param {string} userId - The user ID.
   * @param {string} emoji - The emoji to toggle.
   * @returns {Promise<ReactionResult>} A promise that resolves to `added` or `removed`.
   */
  public async toggleReaction(messageId: string, userId: string, emoji: string): Promise<ReactionResult> {
    if (await this.checkExistReaction(messageId, userId, emoji)) {
      return await this.deleteReaction(messageId, userId, emoji);
    } else {
      return await this.addReaction(messageId, userId, emoji);
    }
  }

  /**
   * Performs a case-insensitive search in the messages table.
   * Searches message content for the specified term.
   * Returns up to 100 results, ordered by creation date with the newest first.
   * @param {string} value - The term to search for in message content.
   * @returns {Promise<SearchMessages>} The matching messages.
   * @throws {Error} If the database query fails.
   */
  public async searchMessages(value: String): Promise<SearchMessages> {
    const { data, error } = await this.supabase
      .from('messages')
      .select(`id, content, created_at, chat_id, channel_id, thread_id`)
      .ilike('content', `%${value}%`)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(`[ DB_CODE:${error.code} ] MSG: ${error.message}`);
    return data;
  }
}

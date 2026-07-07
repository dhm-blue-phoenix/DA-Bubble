import { Injectable, signal, WritableSignal, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  RealtimeChannel,
  SupabaseClient,
  PostgrestSingleResponse,
  RealtimePostgresChangesPayload,
  PostgrestResponse,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import { Message, Messages, Reaction, Reactions } from '../../interfaces/messages';
import { ReactionResult, NewMessage, MsgType } from '../../interfaces/db/db-messages';

@Injectable({
  providedIn: 'root',
})
export class DatabaseMessages implements OnDestroy {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly channels?: RealtimeChannel;

  public readonly _chat_messages: WritableSignal<Messages> = signal<Messages>([]);
  public readonly _channel_messages: WritableSignal<Messages> = signal<Messages>([]);
  public readonly _thread_messages: WritableSignal<Messages> = signal<Messages>([]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.channels = this.subscribeMessages();
    }
  }

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

  private insertEventMessage(payload: RealtimePostgresChangesPayload<object>): void {
    const message: Message = payload.new as Message;
    if (message.chat_id)
      this._chat_messages.update(
        (list: Messages): Messages => this.eventHelperInsertMessage(list, message),
      );
    if (message.channel_id)
      this._channel_messages.update(
        (list: Messages): Messages => this.eventHelperInsertMessage(list, message),
      );
    if (message.thread_id)
      this._thread_messages.update(
        (list: Messages): Messages => this.eventHelperInsertMessage(list, message),
      );
  }

  private eventHelperInsertMessage(list: Messages, message: Message): Messages {
    return list.some((msg: Message): boolean => msg['id'] === message['id'])
      ? list
      : [...list, message];
  }

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

  private eventHelperUpdateMessage(list: Messages, message: Message): Messages {
    return list.map((msg: Message): Message => (msg['id'] === message['id'] ? message : msg));
  }

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
      this._channel_messages.update(
        (list: Messages): Messages => this.eventHelperInsertReaction(list, reaction),
      );
  }

  private eventHelperInsertReaction(list: Messages, reaction: Reaction): Messages {
    return list.map(
      (msg: Message): Message =>
        msg.id === reaction['message_id']
          ? { ...msg, reactions: [...msg['reactions'], reaction] }
          : msg,
    );
  }

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

  public ngOnDestroy(): void {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  public async getMessages(msgType: MsgType, id: string): Promise<void> {
    const { data: messages }: PostgrestResponse<any> = await this.supabase
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
    if (messages) {
      if (msgType === 'chat') this._chat_messages.set(messages);
      if (msgType === 'channel') this._channel_messages.set(messages);
      if (msgType === 'thread') this._thread_messages.set(messages);
    }
  }

  public async updateMessage(messageId: string, newContent: string): Promise<void> {
    await this.supabase
      .from('messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();
  }

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
    await this.supabase
      .from('messages')
      .insert(this.returnMsgType(msgType, threadChannelId, newMessage))
      .select()
      .single();
  }

  private returnMsgType(
    msgType: MsgType,
    threadChannelId: string | null,
    newMessage: NewMessage,
  ): NewMessage {
    return msgType === 'thread'
      ? { ...newMessage, channel_id: threadChannelId as string }
      : newMessage;
  }

  private async checkExistReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<boolean> {
    const data: PostgrestSingleResponse<Reactions | null> = await this.supabase
      .from('reactions')
      .select('*')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();
    return !!data['data'];
  }

  private async deleteReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ReactionResult> {
    await this.supabase
      .from('reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    return { action: 'removed' };
  }

  private async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ReactionResult> {
    await this.supabase
      .from('reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji: emoji,
      })
      .select()
      .single();
    return { action: 'added' };
  }

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

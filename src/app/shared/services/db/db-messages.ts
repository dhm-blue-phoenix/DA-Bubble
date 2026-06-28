import { Injectable, signal, WritableSignal, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  RealtimeChannel,
  SupabaseClient,
  PostgrestError,
  PostgrestSingleResponse,
  RealtimePostgresChangesPayload,
  PostgrestResponse,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';
import { Message, Messages, Reaction, Reactions } from '../../interfaces/messages';

export type ReactionResult = { action: 'added' | 'removed' };
type SupabaseResponseMessage = { data: Message; error: PostgrestError };

@Injectable({
  providedIn: 'root',
})
export class DatabaseMessages implements OnDestroy {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase).supabase;
  private readonly channels?: RealtimeChannel;

  public readonly _messages: WritableSignal<Messages> = signal<Messages>([]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.channels = this.subscribeMessages();
    }
  }

  private subscribeMessages(): RealtimeChannel {
    return this.supabase
      .channel('custom-all-channel')
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
    if (payload.table === 'messages' && payload.eventType === 'INSERT')
      this.insertEventMessage(payload);
    if (payload.table === 'messages' && payload.eventType === 'UPDATE')
      this.updateEventMessage(payload);
    if (payload.table === 'reactions' && payload.eventType === 'INSERT')
      this.insertEventReaction(payload);
    if (payload.table === 'reactions' && payload.eventType === 'DELETE')
      this.deleteEventReaction(payload);
  }

  private insertEventMessage(payload: RealtimePostgresChangesPayload<object>): void {
    const massage: Message = payload.new as Message;
    this._messages.update(
      (list: Messages): Messages =>
        list.some((msg: Message): boolean => msg['id'] === massage['id'])
          ? list
          : [...list, massage],
    );
  }

  private updateEventMessage(payload: RealtimePostgresChangesPayload<object>): void {
    const message: Message = payload.new as Message;

    this._messages.update(
      (list: Messages): Messages =>
        list.map((msg: Message): Message => (msg['id'] === message['id'] ? message : msg)),
    );
  }

  private insertEventReaction(payload: RealtimePostgresChangesPayload<object>): void {
    const reaction = payload.new as Reaction;
    this._messages.update(
      (list: Messages): Messages =>
        list.map(
          (msg: Message): Message =>
            msg.id === reaction.message_id
              ? { ...msg, reactions: [...msg.reactions, reaction] }
              : msg,
        ),
    );
  }

  private deleteEventReaction(payload: RealtimePostgresChangesPayload<object>): void {
    const reaction = payload.old as Reaction;
    this._messages.update(
      (list: Messages): Messages =>
        list.map(
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
        ),
    );
  }

  public ngOnDestroy(): void {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  public async getChatMessages(chatId: string): Promise<void> {
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
      .eq('chat_id', chatId)
      .is('thread_id', null)
      .order('created_at', { ascending: true });
    if (messages) this._messages.set(messages);
  }

  public async updateMessage(messageId: string, newContent: string): Promise<void> {
    const { data, error }: PostgrestSingleResponse<SupabaseResponseMessage> = await this.supabase
      .from('messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();
  }

  public async createNewMessage(chatId: string, senderId: string, content: string): Promise<void> {
    const { data, error }: PostgrestSingleResponse<SupabaseResponseMessage> = await this.supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content: content,
      })
      .select()
      .single();
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
    const data: PostgrestSingleResponse<null> = await this.supabase
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
    const data: PostgrestSingleResponse<Reaction> = await this.supabase
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

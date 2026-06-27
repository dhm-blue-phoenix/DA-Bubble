import { Injectable, signal, WritableSignal, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environment/environment';

import {
  RealtimeChannel,
  SupabaseClient,
  PostgrestError,
  PostgrestSingleResponse,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';
import { Chats } from '../../interfaces/chats';
import { Message, Messages, Reaction, Reactions } from '../../interfaces/messages';

export type ReactionResult = { action: 'added' | 'removed' };
type SupabaseResponseMessage = { data: Message; error: PostgrestError };

@Injectable({
  providedIn: 'root',
})
export class DatabaseMessages {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly debug_logs: boolean = environment.debug_logs;
  private readonly supabase: SupabaseClient = inject(Supabase).supabase;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      if (this.debug_logs) {
        this.debugging();
      }
    }
  }

  private async debugging(): Promise<void> {
    //this.createNewMessage("97119642-5ddf-4363-a0df-7c9686b9da24", '4ad6fbcc-2628-4dc2-9e31-f16e0ff5ca77', 'Hallo Welt 2!');
    console.log(await this.getChatMessages('97119642-5ddf-4363-a0df-7c9686b9da24'));
    //await this.updateMessage('d3331d13-a4e9-412a-8316-773d8ef97ed5', 'BLanla');
    console.warn(
      'Reaction:',
      await this.toggleReaction(
        'd3331d13-a4e9-412a-8316-773d8ef97ed5',
        '451c2bb9-c1ed-4292-af35-b5ea2a5da03b',
        'happy',
      ),
    );
  }

  public async getChatMessages(chatId: string): Promise<void> {
    const { data: messages }: PostgrestSingleResponse<Chats> = await this.supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        edited_at,
        sender_id,
        reactions(emoji, user_id),
        threads!threads_root_message_id_fkey(id)
      `)
      .eq('chat_id', chatId)
      .is('thread_id', null)
      .order('created_at', { ascending: true });

    // Austehende enderung zu einem signal
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

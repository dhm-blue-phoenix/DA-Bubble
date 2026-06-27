import { Injectable, signal, WritableSignal, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environment/environment';

import { RealtimeChannel, SupabaseClient, PostgrestError } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';
import { Chat, Chats, ChatMember, ChatMembers } from '../../interfaces/chats';

type ChatId = string | null;
type ExistChat = { success: boolean; chat_id: ChatId };

@Injectable({
  providedIn: 'root',
})
export class DatabaseChats {
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
    const chatId: string = (await this.getChatId(
      '4ad6fbcc-2628-4dc2-9e31-f16e0ff5ca77',
      '451c2bb9-c1ed-4292-af35-b5ea2a5da03b',
    )) as string;
    //this.createNewMessage(chatId, '4ad6fbcc-2628-4dc2-9e31-f16e0ff5ca77', 'Hallo Welt 2!');
    console.log(await this.getChatMessages(chatId));
    await this.updateMessage('d3331d13-a4e9-412a-8316-773d8ef97ed5', 'BLanla');
  }

  private async checkExistChat(currentUserId: string, otherUserId: string): Promise<ExistChat> {
    const { data: chats } = await this.supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', currentUserId);

    if (chats && chats.length > 0) {
      const chatIds: string[] = chats.map((chat: { chat_id: string }): string => chat.chat_id);

      const { data: sharedChats } = await this.supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', otherUserId)
        .in('chat_id', chatIds);

      if (this.debug_logs) {
        console.warn('sharedChats', sharedChats);
      }

      if (sharedChats && sharedChats.length > 0) {
        return { success: true, chat_id: sharedChats[0].chat_id };
      }
    }
    return { success: false, chat_id: null };
  }

  /**
   * const data = await this.supabase
   *         .from('chat_members')
   *         .select('*, chats(*, messages(*))');
   * */

  private async createNewChat(currentUserId: string, otherUserId: string): Promise<ChatId> {
    const { data: newChat, error } = await this.supabase.from('chats').insert({}).select().single();
    if (error || !newChat) throw error;
    await this.supabase.from('chat_members').insert([
      { chat_id: newChat['id'], user_id: currentUserId },
      { chat_id: newChat['id'], user_id: otherUserId },
    ]);
    return newChat['id'];
  }

  public async getChatId(currentUserId: string, otherUserId: string): Promise<ChatId> {
    const existChat: ExistChat = await this.checkExistChat(currentUserId, otherUserId);
    if (!existChat['success']) return this.createNewChat(currentUserId, otherUserId);
    return existChat['chat_id'];
  }

  public async getChatMessages(chatId: string): Promise<Chats | null> {
    const { data: messages } = await this.supabase
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
    return messages;
  }

  public async updateMessage(messageId: string, newContent: string) {
    const { data, error } = await this.supabase
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
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content: content,
      })
      .select()
      .single();

    console.log(data);
  }
}

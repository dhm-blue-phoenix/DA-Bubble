import { Injectable, inject } from '@angular/core';

import { SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import { ExistChat, ChatId } from '../../interfaces/db/db-chats';

@Injectable({
  providedIn: 'root',
})
export class DatabaseChats {
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];

  private async checkExistChat(currentUserId: string, otherUserId: string): Promise<ExistChat> {
    const { data: chats }: PostgrestSingleResponse<ChatId[]> = await this.supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', currentUserId);
    if (chats && chats.length > 0) {
      const chatIds: string[] = chats.map((chat: ChatId): string => chat.chat_id);
      const { data: sharedChats }: PostgrestSingleResponse<ChatId[]> =
        await this.createNewChatMember(otherUserId, chatIds);
      if (sharedChats && sharedChats.length > 0) {
        return { success: true, chat_id: sharedChats[0].chat_id };
      }
    }
    return { success: false, chat_id: null };
  }

  private async createNewChatMember(
    otherUserId: string,
    chatIds: string[],
  ): Promise<PostgrestSingleResponse<ChatId[]>> {
    return await this.supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', otherUserId)
      .in('chat_id', chatIds);
  }

  private async createNewChat(currentUserId: string, otherUserId: string): Promise<string> {
    const { data: newChat, error }: PostgrestSingleResponse<any> = await this.supabase
      .from('chats')
      .insert({})
      .select()
      .single();
    if (error || !newChat) throw error;
    await this.supabase.from('chat_members').insert([
      { chat_id: newChat['id'], user_id: currentUserId },
      { chat_id: newChat['id'], user_id: otherUserId },
    ]);
    return newChat['id'];
  }

  public async getChatId(currentUserId: string, otherUserId: string): Promise<string> {
    const existChat: ExistChat = await this.checkExistChat(currentUserId, otherUserId);
    if (!existChat['success']) return this.createNewChat(currentUserId, otherUserId);
    return existChat['chat_id'] as string;
  }
}

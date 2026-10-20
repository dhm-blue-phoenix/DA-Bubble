import { Injectable, inject } from '@angular/core';

import { SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import { ExistChat, ChatId } from '../../interfaces/db/db-chats';

@Injectable({
  providedIn: 'root',
})
export class DatabaseChats {
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];

  /**
   * Checks whether a chat already exists between the current user and another user.
   * @param {string} currentUserId - The current user's ID.
   * @param {string} otherUserId - The other user's ID.
   * @returns {Promise<ExistChat>} A promise that resolves to an object indicating success and, if available, the chat ID.
   */
  private async checkExistChat(currentUserId: string, otherUserId: string): Promise<ExistChat> {
    const { data: chats, error }: PostgrestSingleResponse<ChatId[]> = await this.supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', currentUserId)
      .eq('shared_user_id', otherUserId);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    if (chats && chats.length > 0) {
      return { success: true, chat_id: chats[0].chat_id };
    }
    return { success: false, chat_id: null };
  }

  /**
   * Creates a chat for two users and adds them as members.
   * @param {string} currentUserId - The current user's ID.
   * @param {string} otherUserId - The other user's ID.
   * @returns {Promise<string>} A promise that resolves to the new chat ID.
   */
  private async createNewChat(currentUserId: string, otherUserId: string): Promise<string> {
    const { data: newChat, error }: PostgrestSingleResponse<any> = await this.supabase
      .from('chats')
      .insert({})
      .select()
      .single();
    if (error || !newChat) throw error;
    const { error: memberError } = await this.supabase.from('chat_members').insert([
      { chat_id: newChat['id'], user_id: currentUserId, shared_user_id: otherUserId },
      { chat_id: newChat['id'], user_id: otherUserId, shared_user_id: currentUserId },
    ]);
    if (memberError) throw new Error(`[ DB_CODE:${memberError['code']} ] MSG: ${memberError['message']}`);
    return newChat['id'];
  }

  /**
   * Gets the chat ID for a pair of users, creating a chat if one does not exist.
   * @param {string} currentUserId - The current user's ID.
   * @param {string} otherUserId - The other user's ID.
   * @returns {Promise<string>} The ID of the existing or newly created chat.
   */
  public async getChatId(currentUserId: string, otherUserId: string): Promise<string> {
    const existChat: ExistChat = await this.checkExistChat(currentUserId, otherUserId);
    if (!existChat['success']) return this.createNewChat(currentUserId, otherUserId);
    return existChat['chat_id'] as string;
  }
}

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
   * Prüft, ob bereits ein gemeinsamer Chat zwischen dem aktuellen und dem anderen Benutzer existiert.
   * @param {string} currentUserId - Die ID des aktuellen Benutzers.
   * @param {string} otherUserId - Die ID des anderen Benutzers.
   * @returns {Promise<ExistChat>} Ein Promise, das ein Objekt mit dem Erfolg und ggf. der chat_id zurückgibt.
   */
  private async checkExistChat(currentUserId: string, otherUserId: string): Promise<ExistChat> {
    const { data: chats, error }: PostgrestSingleResponse<ChatId[]> = await this.supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', currentUserId);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    if (chats && chats.length > 0) {
      const chatIds: string[] = chats.map((chat: ChatId): string => chat.chat_id);
      const sharedChats: ChatId[] = await this.findSharedChat(otherUserId, chatIds);
      if (sharedChats && sharedChats.length > 0) {
        return { success: true, chat_id: sharedChats[0].chat_id };
      }
    }
    return { success: false, chat_id: null };
  }

  /**
   * Sucht in einer Liste von Chat-IDs nach einer, bei der der andere Benutzer Mitglied ist.
   * @param {string} otherUserId - Die ID des anderen Benutzers.
   * @param {string[]} chatIds - Liste der Chat-IDs, in denen der aktuelle Benutzer ist.
   * @returns {Promise<ChatId[]>} Ein Promise mit der Liste der gemeinsamen Chat-IDs.
   */
  private async findSharedChat(otherUserId: string, chatIds: string[]): Promise<ChatId[]> {
    const { data: sharedChats, error }: PostgrestSingleResponse<ChatId[]> = await this.supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', otherUserId)
      .in('chat_id', chatIds);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    return sharedChats ?? [];
  }

  /**
   * Erstellt einen neuen Chat für zwei Benutzer und fügt diese als Mitglieder hinzu.
   * @param {string} currentUserId - Die ID des aktuellen Benutzers.
   * @param {string} otherUserId - Die ID des anderen Benutzers.
   * @returns {Promise<string>} Ein Promise, das die neue Chat-ID zurückgibt.
   */
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
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    return newChat['id'];
  }

  /**
   * Ermittelt die Chat-ID für ein Benutzerpaar. Falls kein Chat existiert, wird einer erstellt.
   * @param {string} currentUserId - Die ID des aktuellen Benutzers.
   * @param {string} otherUserId - Die ID des anderen Benutzers.
   * @returns {Promise<string>} Die ID des bestehenden oder neu erstellten Chats.
   */
  public async getChatId(currentUserId: string, otherUserId: string): Promise<string> {
    const existChat: ExistChat = await this.checkExistChat(currentUserId, otherUserId);
    if (!existChat['success']) return this.createNewChat(currentUserId, otherUserId);
    return existChat['chat_id'] as string;
  }
}

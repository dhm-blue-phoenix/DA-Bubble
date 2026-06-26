import { Injectable, signal, WritableSignal, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environment/environment';

import { RealtimeChannel, SupabaseClient, PostgrestError } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';
import { Chat, Chats, ChatMember, ChatMembers } from '../../interfaces/chats';

export type ExistChat = { success: boolean; chat_id: string | null };

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

  private debugging(): void {
    this.createNewChat(
      '4ad6fbcc-2628-4dc2-9e31-f16e0ff5ca77',
      '451c2bb9-c1ed-4292-af35-b5ea2a5da03b',
    );
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

  public async createNewChat(currentUserId: string, otherUserId: string): Promise<void> {
    const existChat: ExistChat = await this.checkExistChat(currentUserId, otherUserId);
    if (!existChat['success']) {
      const { data: newChat, error } = await this.supabase
        .from('chats')
        .insert({})
        .select()
        .single();
      console.warn('newChat', newChat);

      if (error || !newChat) throw error;

      await this.supabase.from('chat_members').insert([
        { chat_id: newChat['id'], user_id: currentUserId },
        { chat_id: newChat['id'], user_id: otherUserId },
      ]);

      console.log('newChat', newChat);
    }
  }
}

import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environment/environment';

import {
  SupabaseClient,
  PostgrestSingleResponse,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

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
    /*
    const chatId: string = (await this.getChatId(
      '4ad6fbcc-2628-4dc2-9e31-f16e0ff5ca77',
      '451c2bb9-c1ed-4292-af35-b5ea2a5da03b',
    )) as string;
     */
  }

  private async checkExistChat(currentUserId: string, otherUserId: string): Promise<ExistChat> {
    const { data: chats }: PostgrestSingleResponse<{ chat_id: string; }[]> = await this.supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', currentUserId);

    if (chats && chats.length > 0) {
      const chatIds: string[] = chats.map((chat: { chat_id: string }): string => chat.chat_id);

      const { data: sharedChats }: PostgrestSingleResponse<{ chat_id: string }[]> = await this.supabase
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

  private async createNewChat(currentUserId: string, otherUserId: string): Promise<ChatId> {
    const { data: newChat, error }: PostgrestSingleResponse<any> =
      await this.supabase.from('chats').insert({}).select().single();
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
}

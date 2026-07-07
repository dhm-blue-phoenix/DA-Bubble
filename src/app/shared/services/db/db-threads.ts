import { inject, Injectable } from '@angular/core';

import { SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import { ExistThread } from '../../interfaces/db/db-threads';

@Injectable({
  providedIn: 'root',
})
export class DatabaseThreads {
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];

  private async checkExistThread(
    msgId: string,
  ): Promise<ExistThread> {
    const { data: threads }: PostgrestSingleResponse<any> = await this.supabase
      .from('threads')
      .select('id')
      .eq('root_message_id', msgId);
    if (threads && threads.length > 0) return { success: true, thread_id: threads[0]['id'] };
    return { success: false, thread_id: null };
  }

  private async createNewThread(msgId: string): Promise<string> {
    const { data: newThread }: PostgrestSingleResponse<any> = await this.supabase
      .from('threads')
      .insert({
        root_message_id: msgId,
      })
      .select();
    const threadId: string = newThread[0]['id'];
    await this.updateMessageThreadId(threadId, msgId);
    return threadId;
  }

  private async updateMessageThreadId(threadId: string, msgId: string): Promise<void> {
    await this.supabase
      .from('messages')
      .update({
        thread_id: threadId,
      })
      .eq('id', msgId)
      .select()
      .single();
  }

  public async getThreadId(msgId: string): Promise<string> {
    const existThread: ExistThread = await this.checkExistThread(msgId);
    if (existThread['success']) return existThread['thread_id'] as string;
    return this.createNewThread(msgId);
  }
}

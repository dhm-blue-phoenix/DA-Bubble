import { inject, Injectable } from '@angular/core';

import { SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import { ExistThread } from '../../interfaces/db/db-threads';

@Injectable({
  providedIn: 'root',
})
export class DatabaseThreats {
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
    const { data: newThreat }: PostgrestSingleResponse<any> = await this.supabase
      .from('threads')
      .insert({
        root_message_id: msgId,
      })
      .select();
    const threatId: string = newThreat[0]['id'];
    await this.updateMessageThreadId(threatId, msgId);
    return threatId;
  }

  private async updateMessageThreadId(threatId: string, msgId: string): Promise<void> {
    await this.supabase
      .from('messages')
      .update({
        thread_id: threatId,
      })
      .eq('id', msgId)
      .select()
      .single();
  }

  public async getThreatId(msgId: string): Promise<string> {
    const existThreat: ExistThread = await this.checkExistThread(msgId);
    if (existThreat['success']) return existThreat['thread_id'] as string;
    return this.createNewThread(msgId);
  }
}

import { inject, Injectable } from '@angular/core';

import { SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import { ExistThread } from '../../interfaces/db/db-threads';
import { DbPostgrestError } from '../../interfaces/db-error';

@Injectable({
  providedIn: 'root',
})
export class DatabaseThreads {
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];

  /**
   * Checks whether a thread already exists for a root message.
   * @param {string} msgId - The root message ID.
   * @returns {Promise<ExistThread>} A promise indicating whether a thread exists and, if so, its ID.
   */
  private async checkExistThread(msgId: string): Promise<ExistThread> {
    const { data: threads, error }: PostgrestSingleResponse<any> = await this.supabase
      .from('threads')
      .select('id')
      .eq('root_message_id', msgId);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    if (threads && threads.length > 0) return { success: true, thread_id: threads[0]['id'] };
    return { success: false, thread_id: null };
  }

  /**
   * Creates a thread for the given message.
   * @param {string} msgId - The root message ID.
   * @returns {Promise<string>} A promise that resolves to the new thread ID.
   */
  private async createNewThread(msgId: string): Promise<string> {
    const { data: newThread, error }: PostgrestSingleResponse<any> = await this.supabase
      .from('threads')
      .insert({
        root_message_id: msgId,
      })
      .select();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    if (!newThread || newThread.length === 0) throw new Error('Thread could not create become!');
    const threadId: string = newThread[0]['id'];
    await this.updateMessageThreadId(threadId, msgId);
    return threadId;
  }

  /**
   * Updates a message and sets its `thread_id`.
   * @param {string} threadId - The ID of the created thread.
   * @param {string} msgId - The ID of the message to update.
   * @returns {Promise<void>}
   */
  private async updateMessageThreadId(threadId: string, msgId: string): Promise<void> {
    const { error }: PostgrestSingleResponse<DbPostgrestError> = await this.supabase
      .from('messages')
      .update({
        thread_id: threadId,
      })
      .eq('id', msgId)
      .select()
      .single();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
  }

  /**
   * Gets the thread ID for a message, creating a thread if one does not exist.
   * @param {string} msgId - The root message ID.
   * @returns {Promise<string>} The thread ID.
   */
  public async getThreadId(msgId: string): Promise<string> {
    const existThread: ExistThread = await this.checkExistThread(msgId);
    if (existThread['success']) return existThread['thread_id'] as string;
    return this.createNewThread(msgId);
  }

  /**
   * Counts the messages in an existing thread without loading their content.
   * @param {string} threadId - The thread ID.
   * @returns {Promise<number>} The number of messages in the thread.
   */
  public async getThreadMessageCount(threadId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', threadId);
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    return count ?? 0;
  }
}

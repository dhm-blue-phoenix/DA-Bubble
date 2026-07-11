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
   * Prüft, ob zu einer Ursprungsnachricht bereits ein Thread existiert.
   * @param {string} msgId - Die ID der Ursprungsnachricht.
   * @returns {Promise<ExistThread>} Ein Promise, das das Vorhandensein und ggf. die thread_id zurückgibt.
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
   * Erstellt einen neuen Thread zu einer gegebenen Nachricht.
   * @param {string} msgId - Die ID der Ursprungsnachricht.
   * @returns {Promise<string>} Ein Promise, das die ID des neu erstellten Threads zurückgibt.
   */
  private async createNewThread(msgId: string): Promise<string> {
    const { data: newThread, error }: PostgrestSingleResponse<any> = await this.supabase
      .from('threads')
      .insert({
        root_message_id: msgId,
      })
      .select();
    if (error) throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
    const threadId: string = newThread[0]['id'];
    await this.updateMessageThreadId(threadId, msgId);
    return threadId;
  }

  /**
   * Aktualisiert eine Nachricht und setzt deren thread_id.
   * @param {string} threatId - Die ID des erstellten Threads.
   * @param {string} msgId - Die ID der Nachricht, die aktualisiert werden soll.
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
   * Gibt die Thread-ID zu einer Nachricht zurück. Falls noch keiner existiert, wird ein neuer Thread angelegt.
   * @param {string} msgId - Die ID der Ursprungsnachricht.
   * @returns {Promise<string>} Die ID des Threads.
   */
  public async getThreadId(msgId: string): Promise<string> {
    const existThread: ExistThread = await this.checkExistThread(msgId);
    if (existThread['success']) return existThread['thread_id'] as string;
    return this.createNewThread(msgId);
  }
}

import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  /**
   * Die Instanz des Supabase-Clients für Datenbankoperationen.
   */
  public readonly supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);
}

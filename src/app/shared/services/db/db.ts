import { Injectable } from '@angular/core';
import { environment } from '../../../../environment/environment';

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class DataBase {
  private readonly debug_logs: boolean = environment.debug_logs;
  private readonly supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);
  private currentUserId: string = '';

  constructor() {
    if (this.debug_logs) {
      this.debuging();
    }
  }


  private async debuging(): Promise<void> {
    //console.log('environment', environment);
    //await this.signUpNewUser(environment.debug_user_email, environment.debug_user_password, environment.debug_user_name);
    //await this.signUpNewUser(environment.debug_user2_email, environment.debug_user2_password, environment.debug_user2_name);
    await this.signInWithEmail(environment.debug_user_email, environment.debug_user_password);
    //await this.signOut();

    await this.getProfile(this.currentUserId);
  }


  /*
  * Legt einen neuen Benutzer an
  */
  public async signUpNewUser(user_email: string, user_password: string, user_name: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signUp({
      email: user_email,
      password: user_password,
      options: {
        data: { name: user_name }
      }
    });
    if (this.debug_logs) {
      if (error) console.error('signUpNewUser_error', error);
      console.log('signUpNewUser_data', data);
    }
  }


  /*
  * Meldet den user an
  */
  public async signInWithEmail(user_email: string, user_password: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: user_email,
      password: user_password,
    });
    if (this.debug_logs) {
      if (error) console.error('signInWithEmail_error', error);
      console.log('signInWithEmail_data', data);
    }
    const userData: User | null = data['user'];
    if (userData) {
      this.currentUserId = userData['id'];
    }
  }


  /*
  * Schiekt den user eine email um sein pw zu rezeten
  */
  public async resetPasswordForEmail() { }


  /*
  * Hirmit wirt der user ausgeloggt
  */
  public async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (this.debug_logs && error) {
      console.error('signOut_error', error);
    }
  }


  public async getProfile(userId: string): Promise<void> {
    let { data: profiles, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);

    if (this.debug_logs) {
      if (error) console.error('getProfile_error', error);
      console.log('profiles', profiles);
    }
  }
}

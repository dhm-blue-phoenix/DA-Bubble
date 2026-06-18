import { Injectable } from '@angular/core';
import { environment } from '../../../../environment/environment';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class DataBase {
  private readonly debug_logs: boolean = environment.debug_logs;
  private readonly supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);


  constructor() {
    if (this.debug_logs) {
      this.debuging();
    }
  }


  private async debuging(): Promise<void> {
    console.log('environment', environment);
    await this.signUpNewUser(environment.debug_user_email, environment.debug_user_password);
    //await this.signInWithEmail(environment.debug_user_email, environment.debug_user_password);

    await this.getProfile();

    //this.signOut();
  }


  public async signUpNewUser(user_email: string, user_password: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signUp({
      email: user_email,
      password: user_password
    });
    if (this.debug_logs && error) {
      console.error('signUpNewUser_error', error);
    }
    console.log('signUpNewUser_data', data);
  }


  public async signInWithEmail(user_email: string, user_password: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: user_email,
      password: user_password,
    });
    if (this.debug_logs && error) {
      console.error('signInWithEmail_error', error);
    }
    console.log('signInWithEmail_data', data);
  }


  public async resetPasswordForEmail() { }


  public async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
  }


  public async getProfile(): Promise<void> {
    let { data: profiles, error } = await this.supabase
      .from('profiles')
      .select('*');

    if (this.debug_logs && error) {
      console.error('getProfile_error', error);
    }
    console.log('profiles', profiles);
  }
}

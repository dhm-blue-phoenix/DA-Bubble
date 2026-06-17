import { Injectable } from '@angular/core';
import { environment } from '../../../../environment/environment';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class Db {
  private readonly supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);

  constructor() {
    this.signInWithEmail();
  }

  public async signUpNewUser() {
    const { data, error } = await this.supabase.auth.signUp({
      email: environment.debug_user_email,
      password: environment.debug_user_password,
      options: {
        emailRedirectTo: 'https://example.com/welcome',
      },
    });
    console.log('data', data);
    console.log('error', error);
  }

  public async signInWithEmail() {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: environment.debug_user_email,
      password: environment.debug_user_password,
    })
    console.log('data', data);
    console.log('error', error);
  }
}

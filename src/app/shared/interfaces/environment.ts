export interface Environment {
  supabaseUrl: string;
  supabaseKey: string;
  debug_user_email: string;
  debug_user_password: string;
}

export interface EnvConfig {
  DB_KEY?: string;
  DB_URL?: string;
  DEBUG_USER_EMAIL?: string;
  DEBUG_USER_PASSWORD?: string;
}
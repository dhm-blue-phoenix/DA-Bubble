export interface Environment {
  supabaseUrl: string;
  supabaseKey: string;

  debug_user_name: string;
  debug_user_email: string;
  debug_user_password: string;

  debug_user2_name: string;
  debug_user2_email: string;
  debug_user2_password: string;

  debug_logs: boolean;

  guest_email: string,
  guest_password: string,
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';


const envDbKey: string = 'sb_publishable_v3O-IUFR11hfEg8NKI5_iw_D_6Z0A0y';
const envDbUrl: string = 'https://writgxpyqlxhesmuvipq.supabase.co';
const supabase: SupabaseClient = createClient(envDbUrl, envDbKey);

async function signUpNewUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'dmozelt@gmail.com',
    password: '8Ka4Y&um7#',
    options: {
      emailRedirectTo: 'https://example.com/welcome',
    },
  });
  console.log('data', data);
  console.log('error', error);
}
// signUpNewUser();

async function signInWithEmail() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'dmozelt@gmail.com',
    password: '8Ka4Y&um7#',
  })
  console.log('data', data);
  console.log('error', error);
}

signInWithEmail();
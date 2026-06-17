import { Environment, EnvConfig } from '../app/shared/interfaces/environment';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve('.env');
const env: EnvConfig = dotenv.config({ path: envPath }).parsed || {};

export const environment: Environment = {
    supabaseUrl: env.DB_URL ?? '',
    supabaseKey: env.DB_KEY ?? '',
    debug_user_email: env.DEBUG_USER_EMAIL ?? '',
    debug_user_password: env.DEBUG_USER_PASSWORD ?? '',
};
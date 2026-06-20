export interface Profile {
  id?: string;
  email: string;
  name: string;
  created_at: string;
  status: 'offline' | 'online' | 'away';
  avatar_url: string;
}

export type Profiles = Profile[];

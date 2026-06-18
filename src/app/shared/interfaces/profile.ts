export interface Profile {
  id?: string;
  email: string;
  name: string;
  created_at: string;
  status: 'offline' | 'online' | 'away';
  avatar_url: string;
}

export type Profiles = Profile[];

export const emptyProfile: Profile = {
  email: 'n/a',
  name: 'n/a',
  created_at: 'n/a',
  status: 'offline',
  avatar_url: 'n/a',
};

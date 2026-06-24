export interface Profile {
  readonly id: string;
  readonly email: string;
  name: string;
  readonly created_at: string;
  status: 'offline' | 'online' | 'away';
  readonly avatar_url: string;
}

export type Profiles = Profile[];

export interface Profile {
  readonly id: string;
  readonly email: string;
  name: string;
  readonly created_at: string;
  status: 'offline' | 'online' | 'away';
  readonly avatar: string;
}

export type Profiles = Profile[];

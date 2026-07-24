import { Injectable, inject } from '@angular/core';
import { Database } from './db';
import { Profile } from '../interfaces/profile';

@Injectable({
  providedIn: 'root',
})
export class MentionService {
  private db = inject(Database)

  filterProfiles(query: string): Profile[] {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const profiles = this.db.profiles()
    const startsWith = profiles.filter(p => p.name.toLowerCase().startsWith(q))
    const includes = profiles.filter(p => !startsWith.includes(p) && p.name.toLowerCase().includes(q))
    return [...startsWith, ...includes]
  }
}

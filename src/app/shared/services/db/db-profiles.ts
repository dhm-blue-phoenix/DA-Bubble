import { Injectable, signal, WritableSignal, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import { Profile, Profiles } from '../../interfaces/profile';
import { SupabaseResponseProfiles } from '../../interfaces/db/db-profiles';

@Injectable({
  providedIn: 'root',
})
export class DatabaseProfiles implements OnDestroy {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly channels?: RealtimeChannel;

  /** Signal, welches die Liste der Benutzerprofile hält. */
  public readonly _profiles: WritableSignal<Profiles> = signal<Profiles>([]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.channels = this.subscribeProfiles();
    }
  }

  /**
   * Abonniert die Realtime-Updates für die Profile-Tabelle.
   * @returns {RealtimeChannel} Der abonnierte Supabase Realtime-Kanal.
   */
  private subscribeProfiles(): RealtimeChannel {
    return this.supabase
      .channel('realtime:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) =>
        this.handleProfileEvent(payload),
      )
      .subscribe();
  }

  /**
   * Verarbeitet einkommende Realtime-Events für Profile.
   * @param {any} payload - Das von Supabase übermittelte Event-Objekt.
   */
  private handleProfileEvent(payload: any): void {
    if (payload.eventType === 'INSERT') this.insertProfile(payload);
    if (payload.eventType === 'UPDATE') this.updateProfile(payload);
  }

  /** Beendet die Realtime-Verbindung, wenn der Service zerstört wird. */
  public ngOnDestroy(): void {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  /**
   * Fügt ein neues Profil dem lokalen Signal hinzu (ausgelöst durch Realtime-Event).
   * @param {any} payload - Das Event-Objekt mit den neuen Profildaten.
   */
  private insertProfile(payload: any): void {
    const profile = payload.new as Profile;
    this._profiles.update(
      (list: Profiles): Profiles =>
        list.some((p: Profile): boolean => p.id === profile.id) ? list : [...list, profile],
    );
  }

  /**
   * Aktualisiert ein bestehendes Profil im lokalen Signal (ausgelöst durch Realtime-Event).
   * @param {any} payload - Das Event-Objekt mit den aktualisierten Profildaten.
   */
  private updateProfile(payload: any): void {
    const profile = payload.new as Profile;
    this._profiles.update(
      (list: Profiles): Profiles =>
        list.map((p: Profile): Profile => (p.id === profile.id ? profile : p)),
    );
  }

  /**
   * Lädt alle Benutzerprofile aus der Datenbank und aktualisiert das Signal.
   * @returns {Promise<void>}
   */
  public async getProfiles(): Promise<void> {
    const { data: profiles }: SupabaseResponseProfiles = await this.supabase
      .from('profiles')
      .select('id, name, email, avatar, status, created_at');
    if (profiles) this._profiles.set(profiles);
  }

  /**
   * Lädt die Daten eines spezifischen Profils aus der Datenbank.
   * @param {string} profileId - Die ID des zu ladenden Profils.
   * @returns {Promise<Profile | null>} Ein Promise mit den Profildaten oder null.
   */
  public async getProfile(profileId: string): Promise<Profile | null> {
    const { data: profiles }: SupabaseResponseProfiles = await this.supabase
      .from('profiles')
      .select('id, name, email, avatar, status, created_at')
      .eq('id', profileId);
    return profiles && profiles.length > 0 ? profiles[0] : null;
  }

  /**
   * Aktualisiert den Anzeigenamen eines Profils.
   * @param {string} profileId - Die ID des Profils.
   * @param {string} value - Der neue Name.
   * @returns {Promise<void>}
   */
  public async updateProfileName(profileId: string, value: string): Promise<void> {
    if (profileId.length > 5 && value.length > 1) {
      await this.supabase.from('profiles').update({ name: value }).eq('id', profileId).select();
    }
  }
}

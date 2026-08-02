import { inject, Injectable, OnDestroy } from '@angular/core';

import { DatabaseAuth } from './db-auth';

import {
  SupabaseClient,
} from '@supabase/supabase-js';

import { Supabase } from './db-superbase';

import { DbPostgrestError } from '../../interfaces/db-error';

@Injectable({
  providedIn: 'root',
})
export class DatabaseProfilesHelper implements OnDestroy {
  private readonly supabase: SupabaseClient = inject(Supabase)['supabase'];
  private readonly db_auth: DatabaseAuth = inject(DatabaseAuth);
  private heartbeatInterval?: ReturnType<typeof setInterval>;

  /**
   * Startet das Heartbeat‑Intervall (30s). Bei aktivem User‑Login wird das Feld
   * `last_seen` des zugehörigen Profils auf die aktuelle ISO‑Zeit gesetzt.
   *
   * @private
   */
  public startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async (): Promise<void> => {
      if (this.db_auth.getCurrentUserId()) {
        const { error }: DbPostgrestError = await this.supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', this.db_auth.getCurrentUserId());
        if (error) throw new Error(`[ DB_CODE:${error.code} ] MSG: ${error.message}`);
      }
    }, 30000);
  }

  /**
   * Wird von `DatabaseProfiles` nach dem Aufbau einer Supabase‑Realtime‑Channel‑
   * Subscription aufgerufen. Wenn `status` den Wert `'SUBSCRIBED'` hat, wird das
   * Heartbeat getriggert, andernfalls passiert nichts.
   *
   * @param status Der Status‑String des Supabase‑Channel‑Callbacks (z.B. `'SUBSCRIBED'`).
   */
  public async subscribeHelper(status: string): Promise<void> {
    if (status === 'SUBSCRIBED') {
      this.startHeartbeat();
    }
  }

  /**
   * Angular‑Lifecycle‑Hook: räumt das Heartbeat‑Timer auf, wenn der Service
   * zerstört wird. Verhindert Gedächtnis‑Lecks und unnötige Netzwerk‑Aufrufe.
   */
  public ngOnDestroy(): void {
    clearInterval(this.heartbeatInterval);
  }
}

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
   * Starts the heartbeat interval (30 seconds). While a user is signed in, the profile's
   * `last_seen` field is set to the current ISO timestamp.
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
   * Called by `DatabaseProfiles` after a Supabase Realtime channel subscription is
   * established. Starts the heartbeat when `status` is `'SUBSCRIBED'`; otherwise, does nothing.
   *
   * @param status Der Status‑String des Supabase‑Channel‑Callbacks (z.B. `'SUBSCRIBED'`).
   */
  public async subscribeHelper(status: string): Promise<void> {
    if (status === 'SUBSCRIBED') {
      this.startHeartbeat();
    }
  }

  /**
   * Angular lifecycle hook that clears the heartbeat timer when the service is destroyed.
   * This prevents memory leaks and unnecessary network requests.
   */
  public ngOnDestroy(): void {
    clearInterval(this.heartbeatInterval);
  }
}

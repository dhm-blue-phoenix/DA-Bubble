import { Component, inject, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SignInService } from '../../../../services/singin_service';
import { Database } from '../../../../services/db';
import { UserFeedback } from '../user-feedback/user-feedback';
import { isPlatformBrowser, Location } from '@angular/common';
import { Profile } from '../../../../interfaces/profile';

interface RouterState {
  readonly event: RouterStateEvent;
  readonly provider?: 'google';
}

type RouterStateEvent = 'change_avatar' | 'set_avatar';

@Component({
  selector: 'app-select-avatar',
  imports: [RouterLink, UserFeedback],
  templateUrl: './select-avatar.html',
  styleUrl: './select-avatar.css',
})
export class SelectAvatar {
  private readonly platformId: Object = inject(PLATFORM_ID);
  signin: SignInService = inject(SignInService);
  db: Database = inject(Database);
  router: Router = inject(Router);
  private readonly location = inject(Location);
  show_feedback: WritableSignal<boolean> = signal(false);
  avatars: number[] = [1, 2, 3, 4, 5, 6];
  set_avatar: string = '';
  public googleProfileName: string | null = null;
  protected routerState: RouterState | undefined = undefined;

  ngOnInit(): void {
    const state: unknown = this.location.getState();
    if (
      state &&
      typeof state === 'object' &&
      'event' in state &&
      (state.event === 'change_avatar' || state.event === 'set_avatar')
    ) {
      this.routerState = state as RouterState;
    }

    if (isPlatformBrowser(this.platformId)) {
      const profile: Profile | undefined = this.db
        .profiles()
        .find((profile: Profile): boolean => profile['id'] === this.db.getCurrentUserId());
      if (profile) this.googleProfileName = profile['name'];
    }
  }

  select_Avatar(avatar: number): void {
    this.set_avatar = '';
    this.set_avatar = this.set_avatar + avatar;
    if (this.routerState?.event === 'set_avatar' && this.routerState?.provider === 'google') return;
    this.signin.data.set({
      ...this.signin.data(),
      avatar: this.set_avatar,
    });
  }

  public backToWorkspace(): void {
    this.router.navigate(['/workspace'], {
      state: { event: 'change_avatar' },
    });
  }

  async singin(): Promise<void> {
    if (this.routerState?.event) {
      this.db.editProfileAvatar(this.set_avatar);
      this.routerState?.event === 'change_avatar'
        ? this.backToWorkspace()
        : this.router.navigate(['/workspace']);
      return;
    }
    const { email, password, name, avatar } = this.signin.data();
    const result: false | void = await this.db.register(email, password, name, avatar);
    if (result === false) this.router.navigate(['/sign-in']);
    this.show_feedback.set(true);
  }
}

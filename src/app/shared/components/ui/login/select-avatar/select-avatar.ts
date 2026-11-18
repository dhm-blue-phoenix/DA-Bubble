import { Component, effect, inject, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SignInService } from '../../../../services/singin_service';
import { Database } from '../../../../services/db';
import { UserFeedback } from '../user-feedback/user-feedback';
import { isPlatformBrowser } from '@angular/common';
import { Profile } from '../../../../interfaces/profile';

interface RouterState {
  readonly type: RouterStateType;
  readonly provider?: 'google';
}

type RouterStateType = 'set_avatar' | 'edit_avatar';

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
  show_feedback: WritableSignal<boolean> = signal(false);
  avatars: number[] = [1, 2, 3, 4, 5, 6];
  set_avatar: string = '';
  public googleProfileName: string | null = null;
  private newGoogleProfileAvatar: string | null = null;
  protected routerState: RouterState | undefined = undefined;
  public set_google_avatar: boolean = this.routerState?.type === 'set_avatar' && this.routerState?.provider === 'google';

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.routerState = history.state;
      const profile: Profile | undefined = this.db
        .profiles()
        .find((profile: Profile): boolean => profile['id'] === this.db.getCurrentUserId());
      if (profile) this.googleProfileName = profile['name'];
    }
  }

  select_Avatar(avatar: number): void {
    this.set_avatar = '';
    this.set_avatar = this.set_avatar + avatar;
    if (this.set_google_avatar) return;
    this.signin.data.set({
      ...this.signin.data(),
      avatar: this.set_avatar,
    });
  }

  async singin(): Promise<void> {
    if (this.routerState?.type) {
      this.db.editProfileAvatar(this.set_avatar);
      this.router.navigate(['/workspace']);
      return;
    }
    const { email, password, name, avatar } = this.signin.data();
    const result: false | void = await this.db.register(email, password, name, avatar);
    if (result === false) this.router.navigate(['/sign-in']);
    this.show_feedback.set(true);
  }
}

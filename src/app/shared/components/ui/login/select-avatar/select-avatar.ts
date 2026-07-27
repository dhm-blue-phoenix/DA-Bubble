import { Component, effect, inject, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SignInService } from '../../../../services/singin_service';
import { Database } from '../../../../services/db';
import { UserFeedback } from '../user-feedback/user-feedback';
import { isPlatformBrowser } from '@angular/common';
import { Profile } from '../../../../interfaces/profile';

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
  sel_avatar: string = '';
  public provider: string | undefined = undefined;
  public googleProfileName: string | null = null;
  private newGoogleProfileAvatar: string | null = null;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.provider = history.state['provider'];
      const profile: Profile | undefined = this.db
        .profiles()
        .find((profile: Profile): boolean => profile['id'] === this.db.getCurrentUserId());
      if(profile) this.googleProfileName = profile['name'];
    }
  }

  select_Avatar(avatar: number): void {
    this.sel_avatar = '';
    this.sel_avatar = this.sel_avatar + avatar;
    if(this.provider === 'google') return;
    this.signin.data.set({
      ...this.signin.data(),
      avatar: this.sel_avatar,
    });
  }

    this.show_feedback.set(true)
  async singin(): Promise<void> {
    if(this.provider === 'google') {
      this.db.editProfileAvatar(this.sel_avatar);
      this.router.navigate(['/workspace']);
      return;
    }
    const { email, password, name, avatar } = this.signin.data();
    await this.db.register(email, password, name, avatar);
    this.show_feedback.set(true);
  }
}

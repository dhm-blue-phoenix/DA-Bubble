import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-footer',
  imports: [],
  templateUrl: './login-footer.html',
  styleUrl: './login-footer.css',
})
export class LoginFooter {
  private router: Router = inject(Router);
  private location: Location = inject(Location);

  get showLegalLinks(): boolean {
    if (this.router.url !== '/select-avatar') return true;

    const state: unknown = this.location.getState();
    return !(
      state &&
      typeof state === 'object' &&
      'event' in state &&
      (state.event === 'change_avatar' || state.event === 'set_avatar')
    );
  }

  public navigateRoute(route: String): void {
    this.router.navigate([`/legal/${route}`]);
  }
}

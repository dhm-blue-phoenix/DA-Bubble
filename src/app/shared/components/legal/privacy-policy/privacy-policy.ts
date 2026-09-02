import { Component, inject } from '@angular/core';
import { LoginHeader } from '../../ui/login/login-header/login-header';
import { Router } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  imports: [LoginHeader],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.css',
})
export class PrivacyPolicy {
  private router: Router = inject(Router);

  public navigationBackLogin(): void {
    this.router.navigate(['/']);
  }
}

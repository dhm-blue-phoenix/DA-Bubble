import { Component, inject } from '@angular/core';
import { LoginHeader } from '../../ui/login/login-header/login-header';
import { Router } from '@angular/router';

@Component({
  selector: 'app-imprint',
  imports: [LoginHeader],
  templateUrl: './imprint.html',
  styleUrl: './imprint.css',
})
export class Imprint {
  private router: Router = inject(Router);

  public navigationBackLogin(): void {
    this.router.navigate(['/']);
  };
}

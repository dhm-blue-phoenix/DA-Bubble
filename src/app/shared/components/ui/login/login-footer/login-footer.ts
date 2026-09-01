import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-footer',
  imports: [],
  templateUrl: './login-footer.html',
  styleUrl: './login-footer.css',
})
export class LoginFooter {
  private router: Router = inject(Router);

  public navigateRoute(route: String): void {
    this.router.navigate([`/legal/${route}`]);
  }
}

import { Component, inject } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { Database } from '../../../../services/db';
import { FormsModule, NgForm} from '@angular/forms';
import { SignInService } from '../../../../services/singin_service'


@Component({
  selector: 'app-sign-in',
  imports: [RouterLink, FormsModule],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  private router: Router = inject(Router);

  db = inject(Database);
  signin = inject(SignInService);

  register_Data = {
    name: '',
    email: '',
    password: '',
  };

  checkbox = '';
  public existEmail: boolean = false;
  submitted = false;

  async setSignInData(ngForm: NgForm) {
    this.existEmail = await this.db.checkExistEmailForNewUser(this.register_Data.email);
    this.submitted = true;
    if (ngForm.form.valid && !this.existEmail) {
      this.signin.data.set({
        email: this.register_Data.email,
        password: this.register_Data.password,
        name: this.register_Data.name,
        avatar: '',
      });
      this.router.navigate(['/select-avatar']);
    }
    return;
  }

  public navigateRoute(route: String): void {
    this.router.navigate([`/legal/${route}`]);
  }
}

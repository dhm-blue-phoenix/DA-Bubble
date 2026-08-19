import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { Database } from '../../../../services/db';
import { FormsModule, NgModel } from '@angular/forms';
import { environment } from '../../../../../../environment/environment';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  db: Database = inject(Database);
  router = inject(Router);

  login_Data = {
    email: '',
    password: '',
  };

  public googleLogin(): void {
    this.db.loginWithGoogle();
  }

async login(){

    await this.db.login(this.login_Data.email, this.login_Data.password);

}
async login_as_guest(){
  await this.db.login(environment.guest_email, environment.guest_password)
}
}

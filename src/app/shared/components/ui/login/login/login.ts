import { Component, inject } from '@angular/core';
import { RouterLink, Router } from "@angular/router";
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
  db = inject(Database)
  router = inject(Router)

  login_Data = {
    email: '',
    password: ''
  }

  guest_Data = {
    email: environment.guest_email,
    password: environment.guest_password
  }

async login(){
  await this.db.login(this.login_Data.email, this.login_Data.password)
  if (this.db.isLogin()) {
    this.router.navigate(['/workspace'])
  }
}
login_as_guest(){
  this.router.navigate(['/workspace'])
}
}

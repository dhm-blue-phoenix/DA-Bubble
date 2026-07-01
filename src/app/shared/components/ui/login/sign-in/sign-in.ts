import { Component, inject } from '@angular/core';
import { RouterLink } from "@angular/router";
import { Database } from '../../../../services/db';
import { FormsModule, NgModel } from '@angular/forms';
import { SignInService } from '../../../../services/singin_service'


@Component({
  selector: 'app-sign-in',
  imports: [RouterLink, FormsModule],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  db = inject(Database)
  signin = inject(SignInService)

  register_Data = {
    name :'',
    email:'',
    password:''
  }

  setSignInData(){
    this.signin.data.set({
      email: this.register_Data.email,
      password: this.register_Data.password,
      name: this.register_Data.name,
      avatar:""
    })
  }
}

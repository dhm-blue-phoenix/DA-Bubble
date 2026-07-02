import { Component, inject } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { Database } from '../../../../services/db';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
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
  router = inject(Router)

  register_Data = {
    name :'',
    email:'',
    password:''
  }

  checkbox = ""
  submitted = false

  setSignInData(ngForm: NgForm){
    this.submitted = true
    if(ngForm.form.valid){

      this.signin.data.set({
        email: this.register_Data.email,
        password: this.register_Data.password,
        name: this.register_Data.name,
        avatar:""
      })
      this.router.navigate(['/select-avatar'])
    }
    return
    }
}

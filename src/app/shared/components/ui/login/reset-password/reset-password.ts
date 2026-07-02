import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-reset-password',
  imports: [RouterLink, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {

  new_password = ''
  reapead_new_password = ''
  password_match: boolean | null = null;

  new_Password(){
    this.password_match = null
    if (this.new_password === this.reapead_new_password) {
      this.password_match = true
      console.log('password match')
    }
    else{
      this.password_match = false
      console.log('password not match')
    }

  }
}

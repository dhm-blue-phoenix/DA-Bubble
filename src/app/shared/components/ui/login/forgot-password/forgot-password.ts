import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { UserFeedback } from '../user-feedback/user-feedback';
import { Database } from '../../../../services/db';
@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, FormsModule, UserFeedback],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {

  db = inject(Database)
  send_email= ''
  show_feedback = signal(false);
  

async sending_mail(){
  try{
    this.show_feedback.set(true);
    await this.db.sendEmailForPasswordReset(this.send_email)
    this.send_email= ''
    setTimeout(() => this.show_feedback.set(false), 3000);
  }
  catch{
    console.warn("email not sending at: " + this.send_email)
  }

  }
}

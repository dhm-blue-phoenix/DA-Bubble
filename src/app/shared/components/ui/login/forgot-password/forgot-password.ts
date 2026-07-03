import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { UserFeedback } from '../user-feedback/user-feedback';
@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, FormsModule, UserFeedback],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {

  send_email= ''
  show_feedback = signal(false);

  sending_mail(){
    console.log(this.send_email)
    this.show_feedback.set(true);
    setTimeout(() => this.show_feedback.set(false), 3000);

  }
}

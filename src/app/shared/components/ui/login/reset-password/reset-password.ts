import { Component, inject, signal } from '@angular/core';
import { RouterLink, Route, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { UserFeedback } from '../user-feedback/user-feedback';

@Component({
  selector: 'app-reset-password',
  imports: [RouterLink, FormsModule, UserFeedback],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  new_password = ''
  reapead_new_password = ''
  password_match: boolean | null = null;
  show_feedback = signal(false);
  router = inject(Router)

  new_Password() {
    this.password_match = null;
    if (this.new_password === this.reapead_new_password) {
        this.password_match = true;
        this.show_feedback.set(true);
        
        setTimeout(() => {
        this.show_feedback.set(false),
        this.router.navigate(['/'])
      }, 3000);
    } else {
      this.password_match = false;
    }
  }
}

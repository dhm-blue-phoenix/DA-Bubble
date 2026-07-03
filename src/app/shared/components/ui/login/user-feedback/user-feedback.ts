import { Component, input } from '@angular/core';

@Component({
  selector: 'app-user-feedback',
  imports: [],
  templateUrl: './user-feedback.html',
  styleUrl: './user-feedback.css',
})
export class UserFeedback {
  show = input(false);
  showIcon = input(false)
}

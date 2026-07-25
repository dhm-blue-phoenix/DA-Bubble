import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Profile } from '../../../../interfaces/profile';

@Component({
  selector: 'app-profile-dialog',
  imports: [],
  templateUrl: './profile-dialog.html',
  styleUrl: './profile-dialog.css',
})
export class ProfileDialog {
  @Input() profile: Profile | null = null
  @Output() closed = new EventEmitter<void>()
  @Output() message = new EventEmitter<string>()

  sendMessage() {
    if (this.profile) this.message.emit(this.profile.id)
  }
}

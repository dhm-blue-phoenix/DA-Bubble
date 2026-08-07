import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Profile } from '../../../../interfaces/profile';

@Component({
  selector: 'app-user-profile-dialog',
  imports: [FormsModule],
  templateUrl: './user-profile-dialog.html',
  styleUrl: './user-profile-dialog.css',
})
export class UserProfileDialog {
  @Input() profile: Profile | null = null
  @Output() closed = new EventEmitter<void>()
  @Output() save = new EventEmitter<string>()

  editing = false
  nameDraft = ''

  toggleEdit() {
    this.nameDraft = this.profile?.name ?? ''
    this.editing = true
  }

  cancelEdit() {
    this.editing = false
  }

  saveEdit() {
    this.save.emit(this.nameDraft)
    this.editing = false
  }
}

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Profile } from '../../../../interfaces/profile';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-profile-dialog',
  imports: [FormsModule],
  templateUrl: './user-profile-dialog.html',
  styleUrl: './user-profile-dialog.css',
})
export class UserProfileDialog {
  private readonly router: Router = inject(Router);

  @Input() profile: Profile | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  editing = false;
  nameDraft = '';

  toggleEdit() {
    this.nameDraft = this.profile?.name ?? '';
    this.editing = true;
  }

  cancelEdit() {
    this.editing = false;
  }

  saveEdit() {
    this.save.emit(this.nameDraft);
    this.editing = false;
  }

  public openAvatarDialog(): void {
    this.router.navigate(['select-avatar'], {
      state: { event: 'change_avatar' },
    });
  }
}

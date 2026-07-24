import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { Database } from '../../../../services/db';
import { Profile } from '../../../../interfaces/profile';

@Component({
  selector: 'app-members-dialog',
  imports: [],
  templateUrl: './members-dialog.html',
  styleUrl: './members-dialog.css',
})
export class MembersDialog {
  @Input() memberProfiles: Profile[] = []
  @Output() closed = new EventEmitter<void>()
  @Output() addMember = new EventEmitter<void>()

  db = inject(Database)
}

import { Component, computed, inject, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Database } from '../../../services/db';
import { FormsModule, NgModel } from '@angular/forms';
import { ActiveService } from '../../../services/set_aktiv_service';


@Component({
  selector: 'app-header-component',
  imports: [FormsModule],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {

  dialog_open = false

  @Output() openUserProfile = new EventEmitter<void>()

  router = inject(Router)
  db = inject(Database)
  active = inject(ActiveService);

  currentUser = computed(() => this.db.profiles().find(p => p.id === this.db.getCurrentUserId()) ?? null)

  toggle_Dialog() {
    this.dialog_open = ! this.dialog_open
  }

  openProfile() {
    this.openUserProfile.emit()
    this.dialog_open = false
  }

  logout(){
    this.db.logout();
    this.router.navigate(['/'])
  }

}

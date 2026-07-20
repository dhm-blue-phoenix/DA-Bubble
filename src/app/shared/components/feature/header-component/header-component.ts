import { Component, computed, inject } from '@angular/core';
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
  profile_open = false
  edit_profile = false

  router = inject(Router)
  db = inject(Database)
  active = inject(ActiveService);

  currentUser = computed(() => this.db.profiles().find(p => p.id === this.db.getCurrentUserId()) ?? null)
  new_Username:string = ""

  toggle_Dialog() {
    this.dialog_open = ! this.dialog_open
  }
  toggle_Profile(){
    this.profile_open = !this.profile_open
    this.dialog_open = false
  }

  toggle_EditProfile(){
    this.edit_profile = !this.edit_profile
  }

  logout(){
    this.db.logout();
    this.router.navigate(['/'])
  }

edit_Name(){
  const profile = this.currentUser()
  if (profile) {
    this.db.editProfileName(profile.id, this.new_Username)
    this.toggle_Profile()
    this.edit_profile = false
  }
}

}

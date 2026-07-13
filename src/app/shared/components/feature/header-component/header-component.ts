import { Component, inject,signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Database } from '../../../services/db';
import { FormsModule, NgModel } from '@angular/forms';
import { Profile } from '../../../interfaces/profile';


@Component({
  selector: 'app-header-component',
  imports: [FormsModule],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {

  constructor() {
  this.db.getProfile('631b4bad-b6ee-439a-b9e8-e366d03afa39').then(profile => this.currentUser.set(profile));
}

  dialog_open = false
  profile_open = false
  edit_profile = false
  router = inject(Router)
  db = inject(Database)

  currentUser = signal<Profile | null>(null)
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

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProcessedData } from '../../../services/processed_data';
import { Database } from '../../../services/db';
import { FormsModule, NgModel } from '@angular/forms';


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
  user = inject(ProcessedData)
  db = inject(Database)

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

  ngOnInit() {
    this.user.loadCurrentUser();
  }

  logout(){
    this.user.logoutCurrentUser() ;
    this.router.navigate(['/'])
  }

edit_Name(){
  const profile = this.user.currentUser()
  if (profile) {
    this.db.editProfileName(profile.id, this.new_Username)
    this.user.currentUser.set({...profile, name: this.new_Username })
    this.toggle_Profile()
    this.edit_profile = false
  }
}
}

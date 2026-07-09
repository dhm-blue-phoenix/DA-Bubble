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
  edit_profile = true
  router = inject(Router)
  user = inject(ProcessedData)
  db = inject(Database)

  current_username:string = ""

  toggle_Dialog() {
    this.dialog_open = ! this.dialog_open
  }
  openProfile(){
    this.profile_open = !this.profile_open
    this.dialog_open = false
  }

  ngOnInit() {
    this.user.loadCurrentUser();
  }

  logout(){
    this.user.logoutCurrentUser() ;
    console.log('User logged out, currentUser:', this.user.currentUser());
    this.router.navigate(['/'])
  }

async edit_Name(){
  const id = this.user.currentUser()?.id
  if (id)
    {
      console.log("username chaning form " + this.user.currentUser()?.name + " to " + this.current_username)
      console.log(id)
      await this.db.editProfileName(this.user.currentUser()?.id ?? 'Null#', this.current_username)
    }
    else{
      console.log("not changing")
    }
  }
}

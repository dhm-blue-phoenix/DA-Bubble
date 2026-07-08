import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProcessedData } from '../../../services/processed_data';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-header-component',
  imports: [NgClass],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {

  dialog_open = false
  profile_open = false
  router = inject(Router)
  user = inject(ProcessedData)

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
}

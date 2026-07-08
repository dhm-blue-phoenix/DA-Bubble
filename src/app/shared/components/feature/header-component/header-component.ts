import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProcessedData } from '../../../services/processed_data';

@Component({
  selector: 'app-header-component',
  imports: [],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {

  dialog_open = false
  router = inject(Router)
  user = inject(ProcessedData)

  toggle_Dialog() {
    this.dialog_open = ! this.dialog_open
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

import { Component, inject, signal } from '@angular/core';
import { Profile } from '../../../interfaces/profile';
import { Database } from '../../../services/db';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-header-component',
  imports: [],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {

  dialog_open = false

  db = inject(Database)
  router = inject(Router)
  currentUser = signal<Profile | null>(null);

  async ngOnInit() {
    const id = this.db.getCurrentProfileId();
    if (id){
        this.currentUser.set(await this.db.getProfile(id));
        console.log('Current User:', this.currentUser());
    }
}

  toggle_Dialog() {
    this.dialog_open = ! this.dialog_open
  }

  logout(){
    this.db.logout();
    this.currentUser.set(null);
    console.log('User logged out, currentUser:', this.currentUser());
    this.router.navigate(['/'])
  }
}

import { Component, inject, signal, Injectable } from '@angular/core';
import { Database } from '../services/db';
import { Router, RouterLink } from '@angular/router';
import { Profile } from '../interfaces/profile';



@ Injectable({ providedIn: 'root' })
export class ProcessedData {

  db = inject(Database)
  router = inject(Router)
  currentUser = signal<Profile | null>(null);

  async loadCurrentUser() {
    const id = this.db.getCurrentProfileId();
    this.currentUser.set(id ? await this.db.getProfile(id) : null);
    console.log('Current user loaded:', this.currentUser());
  }

  logoutCurrentUser() {
    this.currentUser.set(null);
    this.db.logout();
  }

}

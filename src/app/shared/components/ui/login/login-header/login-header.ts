import { Component, inject } from '@angular/core';
import {  Router, RouterLink } from "@angular/router";
inject

@Component({
  selector: 'app-login-header',
  imports: [RouterLink],
  templateUrl: './login-header.html',
  styleUrl: './login-header.css',
})
export class LoginHeader {
  private router = inject(Router);

  get isLogingRoot(): boolean{
    return this.router.url === '/'
  }
}

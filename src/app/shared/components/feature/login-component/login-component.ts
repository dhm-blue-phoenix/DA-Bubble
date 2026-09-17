import { Component, inject } from '@angular/core';
import { LoginHeader } from '../../ui/login/login-header/login-header';
import { LoginFooter } from '../../ui/login/login-footer/login-footer';
import { Router, RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-component',
  imports: [LoginHeader, LoginFooter, RouterOutlet, RouterLink],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent {

  private router = inject(Router);

  animation = false

  get isLoginRoot(): boolean {
    return this.router.url === '/'
  }

ngOnInit(){
  this.animation = true
  setTimeout(() => this.animation = false, 3000)
}
}

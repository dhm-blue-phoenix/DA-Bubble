import { Component } from '@angular/core';
import { LoginHeader } from '../../ui/login-header/login-header';
import { LoginFooter } from '../../ui/login-footer/login-footer';

@Component({
  selector: 'app-login-component',
  imports: [LoginHeader, LoginFooter],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent {}

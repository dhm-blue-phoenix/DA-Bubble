import { Component } from '@angular/core';
import { LoginHeader } from '../../ui/login/login-header/login-header';
import { LoginFooter } from '../../ui/login/login-footer/login-footer';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-login-component',
  imports: [LoginHeader, LoginFooter, RouterOutlet],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent {}

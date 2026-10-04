import { Component } from '@angular/core';
import { LoginHeader } from '../../ui/login/login-header/login-header';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  imports: [LoginHeader, RouterLink],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.css',
})
export class PrivacyPolicy { }

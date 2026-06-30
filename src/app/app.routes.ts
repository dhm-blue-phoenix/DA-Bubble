import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/feature/layout-component';
import { LoginComponent } from './shared/components/feature/login-component/login-component';
import { Login } from './shared/components/ui/login/login/login';
import { ForgotPassword } from './shared/components/ui/login/forgot-password/forgot-password';
import { SignIn } from './shared/components/ui/login/sign-in/sign-in';
import path from 'path';

export const routes: Routes = [
    { path: '', component: LayoutComponent },
    { path: 'login', component: LoginComponent, children: [
        {path: '', component: Login},
        {path: 'forgot-password', component: ForgotPassword},
        {path: 'sign-in', component: SignIn},
    ]},
    { path: '**', redirectTo: '' },
];

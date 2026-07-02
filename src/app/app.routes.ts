import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/feature/layout-component';
import { LoginComponent } from './shared/components/feature/login-component/login-component';
import { Login } from './shared/components/ui/login/login/login';
import { ForgotPassword } from './shared/components/ui/login/forgot-password/forgot-password';
import { SignIn } from './shared/components/ui/login/sign-in/sign-in';
import { ResetPassword } from'./shared/components/ui/login/reset-password/reset-password';
import { SelectAvatar } from'./shared/components/ui/login/select-avatar/select-avatar';
import path from 'path';

export const routes: Routes = [
    { path: '', component: LoginComponent, children: [
        {path: '', component: Login},
        {path: 'sign-in', component: SignIn},
        {path: 'select-avatar', component: SelectAvatar},
        {path: 'forgot-password', component: ForgotPassword},
        {path: 'reset-password', component: ResetPassword},
    ]},
    { path: 'workspace', component: LayoutComponent },
    { path: '**', redirectTo: '' },
];

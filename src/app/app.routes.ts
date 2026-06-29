import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/feature/layout-component';
import { LoginComponent } from './shared/components/feature/login-component/login-component';

export const routes: Routes = [
    { path: '', component: LayoutComponent },
    { path: 'login', component: LoginComponent },
    { path: '**', redirectTo: '' },
];

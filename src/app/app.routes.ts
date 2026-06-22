import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/feature/layout-component';

export const routes: Routes = [
    { path: '', component: LayoutComponent },
    { path: '**', redirectTo: '' },
];

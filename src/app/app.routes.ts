import { Routes } from '@angular/router';
import { MainComponent } from './shared/components/main-component/main-component';

export const routes: Routes = [
    { path: '', component: MainComponent },

    { path: '**', redirectTo: '' },
];

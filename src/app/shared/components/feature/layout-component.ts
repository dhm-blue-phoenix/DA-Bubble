import { Component } from '@angular/core';
import { HeaderComponent } from './header-component/header-component';
import { MainComponent } from './main-component/main-component';

@Component({
  selector: 'app-layout-component',
  imports: [HeaderComponent, MainComponent],
  templateUrl: './layout-component.html',
  styleUrl: './layout-component.css',
})
export class LayoutComponent {}

import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DataBase } from './shared/services/db/db'; // DB Befindet sich aktuell noch in der Testphase

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('da_bubble');

  constructor(private readonly db: DataBase) {}
}

import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Db } from './shared/services/db/db';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('da_bubble');

  constructor(private readonly db: Db) {
    // DB SERVICE TEST
  }
}

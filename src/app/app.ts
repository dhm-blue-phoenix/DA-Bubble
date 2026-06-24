import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Database } from './shared/services/db';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('da_bubble');

  public readonly db: Database = inject(Database);

  constructor() {}
}

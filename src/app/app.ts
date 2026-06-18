import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DatabaseProfils } from './shared/services/db/db_profils';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('da_bubble');

  private readonly db = inject(DatabaseProfils);
  public readonly profiles = this.db.profiles;

  constructor() {}
}

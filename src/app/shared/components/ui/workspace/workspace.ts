import { Component, Input, inject } from '@angular/core';
import { Profile } from '../../../interfaces/profile';
import { Database } from '../../../services/db';

@Component({
  selector: 'app-workspace',
  imports: [],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
})
export class Workspace {
@Input() user!: Profile
@Input() isActive: boolean = false

db = inject(Database);

}


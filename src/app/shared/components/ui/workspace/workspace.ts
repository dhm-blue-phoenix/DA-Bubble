import { Component, Input } from '@angular/core';
import { Profile } from '../../../interfaces/profile';

@Component({
  selector: 'app-workspace',
  imports: [],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
})
export class Workspace {
@Input() user!: Profile

}


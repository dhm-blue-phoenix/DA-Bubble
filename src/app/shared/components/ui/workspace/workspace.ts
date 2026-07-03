import { Component, Input } from '@angular/core';
import { Profile } from '../../../interfaces/profile';
import { ActiveService } from '../../../services/set_aktiv_service';
import { inject} from '@angular/core';




@Component({
  selector: 'app-workspace',
  imports: [],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
})
export class Workspace {
@Input() user!: Profile

active = inject(ActiveService);

}


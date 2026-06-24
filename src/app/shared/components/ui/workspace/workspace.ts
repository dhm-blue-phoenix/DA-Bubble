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

aktiv_DM : string | null = null; 

setAktivDM(user_id: string) {
    this.aktiv_DM = null;
    this.aktiv_DM = user_id;

    console.log(this.aktiv_DM)
}

}


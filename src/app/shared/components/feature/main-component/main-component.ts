import { Component } from '@angular/core';
import { Workspace } from '../../ui/workspace/workspace'
import { Profile } from '../../../interfaces/profile';


@Component({
  selector: 'app-main-component',
  imports: [Workspace,],
  templateUrl: './main-component.html',
  styleUrl: './main-component.css',
})
export class MainComponent {

user: Profile[] = [
{  id: '1', email: 'EliasNeumann@web.de', name:"Elias Neumann", created_at: '01.01.1993', status: 'online', avatar_url: 'assets/svg/avatar/avatar_small/1.svg'},
{  id: '2', email: 'EliasNeumann@web.de', name:"Fred Neumann", created_at: '01.01.1993', status: 'offline', avatar_url: 'assets/svg/avatar/avatar_small/2.svg'},
{  id: '3', email: 'EliasNeumann@web.de', name:"Peter Lustig", created_at: '01.01.1993', status: 'offline', avatar_url: 'assets/svg/avatar/avatar_small/3.svg'},
{  id: '4', email: 'EliasNeumann@web.de', name:"Anna Hansen", created_at: '01.01.1993', status: 'online', avatar_url: 'assets/svg/avatar/avatar_small/4.svg'},

]

}

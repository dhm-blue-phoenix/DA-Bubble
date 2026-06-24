import { Component } from '@angular/core';
import { Workspace } from '../../ui/workspace/workspace'
import { Channels } from '../../ui/channels/channels'
import { Profile } from '../../../interfaces/profile';


interface ChannelInterface{
    id: string;
    name: string;
    description: string;
    created_at: string;
    edited_at: string;
    members: Member[];
    messages: Message[];
}

interface Member{
    user_id: string;
    role: 'admin' | 'member';
}
interface Message{
    id: string;
    sender_id: string;
    content: string;
    timestamp: string;
    edited_at: string;
    // reactions: Reaction[];
    threads_id: string;
}
@Component({
  selector: 'app-main-component',
  imports: [Workspace, Channels],
  templateUrl: './main-component.html',
  styleUrl: './main-component.css',
})
export class MainComponent {

channelOpen = true
dmOpen = true

users: Profile[] = [
        {  id: '1', email: 'EliasNeumann@web.de', name:"Elias Neumann", created_at: '01.01.1993', status: 'online', avatar_url: 'assets/svg/avatar/avatar_small/1.svg'},
        {  id: '2', email: 'EliasNeumann@web.de', name:"Fred Neumann", created_at: '01.01.1993', status: 'offline', avatar_url: 'assets/svg/avatar/avatar_small/2.svg'},
        {  id: '3', email: 'EliasNeumann@web.de', name:"Peter Lustig", created_at: '01.01.1993', status: 'offline', avatar_url: 'assets/svg/avatar/avatar_small/3.svg'},
        {  id: '4', email: 'EliasNeumann@web.de', name:"Anna Hansen", created_at: '01.01.1993', status: 'online', avatar_url: 'assets/svg/avatar/avatar_small/4.svg'},
    ]

channel: ChannelInterface[] = [
        {  id: '1', name: 'Entwicklerteam', description:"", created_at: '01.01.1993', edited_at: '01.01.1994', members: [], messages: []},
        {  id: '2', name: 'Test', description:"", created_at: '01.01.1993', edited_at: '01.01.1994', members: [], messages: []},
        {  id: '3', name: 'Figmateam', description:"", created_at: '01.01.1993', edited_at: '01.01.1994', members: [], messages: []},
        {  id: '4', name: 'Codeanalyse', description:"", created_at: '01.01.1993', edited_at: '01.01.1994', members: [], messages: []},
    ]

toggleMenu(menu: 'dmOpen' | 'channelOpen') {
    if (menu === 'dmOpen') this.dmOpen = !this.dmOpen;
    if (menu === 'channelOpen') this.channelOpen = !this.channelOpen;
}


}
export type Channel = ChannelInterface;


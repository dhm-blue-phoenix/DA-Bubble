import { Component, inject, signal } from '@angular/core';
import { Workspace } from '../../ui/workspace/workspace'
import { Channels } from '../../ui/channels/channels'
import { Database } from '../../../services/db';



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
workspace_Open = true
thread_Open = true

db = inject(Database)

all_user = this.db.profiles
all_channels = this.db.channels

constructor(){
    this.db.getChannels('631b4bad-b6ee-439a-b9e8-e366d03afa39')
}


toggleMenu(menu: 'dmOpen' | 'channelOpen' | 'workspace' | 'thread') {
    if (menu === 'dmOpen') this.dmOpen = !this.dmOpen;
    if (menu === 'channelOpen') this.channelOpen = !this.channelOpen;
    if (menu === 'workspace') this.workspace_Open = !this.workspace_Open;
    if (menu === 'thread') this.thread_Open = !this.thread_Open;
}


}
export type Channel = ChannelInterface;


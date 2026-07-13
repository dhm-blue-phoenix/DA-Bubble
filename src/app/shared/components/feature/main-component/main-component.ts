import { Component, inject, signal } from '@angular/core';
import { Workspace } from '../../ui/workspace/workspace'
import { Channels } from '../../ui/channels/channels'
import { Chat } from '../../ui/chat/chat'
import { Database } from '../../../services/db';

@Component({
  selector: 'app-main-component',
  imports: [Workspace, Channels, Chat],
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

channel_id = '' 
channel_content = this.db.channel

constructor(){
    this.db.getChannels('631b4bad-b6ee-439a-b9e8-e366d03afa39')
}

toggleMenu(menu: 'dmOpen' | 'channelOpen' | 'workspace' | 'thread') {
    if (menu === 'dmOpen') this.dmOpen = !this.dmOpen;
    if (menu === 'channelOpen') this.channelOpen = !this.channelOpen;
    if (menu === 'workspace') this.workspace_Open = !this.workspace_Open;
    if (menu === 'thread') this.thread_Open = !this.thread_Open;
}

Open_Chat (id:string){
    this.channel_id = id
    console.log('channelid = ' + this.channel_id)
    this.db.getChannelContent(id)
}

}



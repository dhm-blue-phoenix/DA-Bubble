import { Component, inject, signal, WritableSignal, computed } from '@angular/core';
import { Workspace } from '../../ui/workspace/workspace'
import { Channels } from '../../ui/channels/channels'
import { Chat } from '../../ui/chat/chat'
import { Input } from '../../ui/input/input';
import { Database } from '../../../services/db';
import { Profile } from '../../../interfaces/profile';

@Component({
  selector: 'app-main-component',
  imports: [Workspace, Channels, Chat, Input],
  templateUrl: './main-component.html',
  styleUrl: './main-component.css',
})
export class MainComponent {

channelOpen = true
dmOpen = true
workspace_Open = true
thread_Open = false

db = inject(Database)

all_user = this.db.profiles
all_channels = this.db.channels
all_channel_members = ""


channel_id = ''
channel_info = this.db.channel
channel_content = this.db.channelMsg

channel_member_profiles: WritableSignal<Profile[]> = signal<Profile[]>([])

constructor(){
    this.db.getChannels(this.db.getCurrentUserId())
}

toggleMenu(menu: 'dmOpen' | 'channelOpen' | 'workspace' | 'thread') {
    if (menu === 'dmOpen') this.dmOpen = !this.dmOpen;
    if (menu === 'channelOpen') this.channelOpen = !this.channelOpen;
    if (menu === 'workspace') this.workspace_Open = !this.workspace_Open;
    if (menu === 'thread') this.thread_Open = !this.thread_Open;
}

async Open_Chat(id: string) {
    this.channel_id = id
    this.db.loadMsg('channel', id)

    await this.db.getChannelContent(id)

    const members = this.channel_info()?.channel_members ?? []
    const profiles = members
        .map(m => this.all_user().find(u => u.id === m.user_id))
        .filter((p): p is Profile => p !== undefined)

    this.channel_member_profiles.set(profiles)
}
messages_with_sender = computed(() =>
    this.channel_content().map(message => ({
        message,
        sender: this.all_user().find(u => u.id === message.sender_id)
    }))
);

send_channel_content(content:string){
    const senderId = this.db.getCurrentUserId()

    if (senderId) {
        this.db.newMsg('channel', null, this.channel_id, senderId, content)
    }
    else
        console.log('fehler beim senden der daten')
}
}



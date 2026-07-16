import { Component, inject, signal, WritableSignal, computed } from '@angular/core';
import { Workspace } from '../../ui/workspace/workspace'
import { Channels } from '../../ui/channels/channels'
import { Chat } from '../../ui/chat/chat'
import { Input } from '../../ui/input/input';
import { Database } from '../../../services/db';
import { Profile } from '../../../interfaces/profile';
import { ActiveService } from '../../../services/set_aktiv_service';
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

active_type: WritableSignal<'channel' | 'chat'> = signal('channel')

chat_content = this.db.chatMsg

channel_id = ''
channel_info = this.db.channel
channel_content = this.db.channelMsg

channel_member_profiles: WritableSignal<Profile[]> = signal<Profile[]>([])
dm_partner: WritableSignal<Profile | null> = signal<Profile | null>(null)

active_content = computed(() =>
    this.active_type() === 'chat' ? this.chat_content() : this.channel_content()
)

is_self_chat = computed(() => this.dm_partner()?.id === this.db.getCurrentUserId())

constructor(){
    this.db.getChannels(this.db.getCurrentUserId())
}

toggleMenu(menu: 'dmOpen' | 'channelOpen' | 'workspace' | 'thread') {
    if (menu === 'dmOpen') this.dmOpen = !this.dmOpen;
    if (menu === 'channelOpen') this.channelOpen = !this.channelOpen;
    if (menu === 'workspace') this.workspace_Open = !this.workspace_Open;
    if (menu === 'thread') this.thread_Open = !this.thread_Open;
}

messages_with_sender = computed(() =>
    this.active_content().map(message => ({
        message,
        sender: this.all_user().find(u => u.id === message.sender_id)
    }))
);

async open_Dm(id:string){
    this.active_type.set('chat')
    this.dm_partner.set(this.all_user().find(u => u.id === id) ?? null)

    const dm = await this.db.getChatId(id)
    this.db.loadMsg('chat', dm)
}

async open_Chat(id: string) {
    this.active_type.set('channel')
    this.channel_id = id
    this.db.loadMsg('channel', id)
    await this.db.getChannelContent(id)

    this.channel_member_profiles.set(this.resolveMemberProfiles())
}

resolveMemberProfiles(): Profile[] {
    const members = this.channel_info()?.channel_members ?? []
    return members
        .map(m => this.all_user().find(u => u.id === m.user_id))
        .filter((p): p is Profile => p !== undefined)
}

send_channel_content(content:string){
    const senderId = this.db.getCurrentUserId()
    if (senderId) 
        this.db.newMsg('channel', null, this.channel_id, senderId, content) 
    else
        console.error('not sending')
}



}



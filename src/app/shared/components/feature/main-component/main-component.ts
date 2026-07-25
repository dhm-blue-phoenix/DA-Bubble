import { Component, inject, signal, WritableSignal, computed, effect, viewChild, ElementRef } from '@angular/core';
import { Workspace } from '../../ui/workspace/workspace'
import { Channels } from '../../ui/channels/channels'
import { Chat } from '../../ui/chat/chat'
import { Thread } from '../../ui/thread/thread';
import { Input } from '../../ui/input/input';
import { ChatHeader } from '../../ui/chat-header/chat-header';
import { Database } from '../../../services/db';
import { Profile } from '../../../interfaces/profile';
import { Dialogs } from '../../ui/dialogs/dialogs';

@Component({
  selector: 'app-main-component',
  imports: [Workspace, Channels, Chat, Input, Thread, ChatHeader, Dialogs],
  templateUrl: './main-component.html',
  styleUrl: './main-component.css',
})
export class MainComponent {

channelOpen = true
dmOpen = true
workspace_Open = true
thread_Open = false

db = inject(Database)

active_type: WritableSignal<'channel' | 'chat' | null> = signal(null)
channel_member_profiles: WritableSignal<Profile[]> = signal<Profile[]>([])
dm_partner: WritableSignal<Profile | null> = signal<Profile | null>(null)
dialog_mode: WritableSignal<'editChannel' | 'addChannel' | 'addMember' | 'members' | null> = signal(null)
profile_user: WritableSignal<Profile | null> = signal(null)

all_user = this.db.profiles
all_channels = this.db.channels
all_channel_members = ""


chat_content = this.db.chatMsg

channel_id = ''
chat_id = ''
channel_info = this.db.channel
channel_content = this.db.channelMsg


chatHistory = viewChild<ElementRef<HTMLDivElement>>('chatHistory')

constructor(){
    effect(() => {
        if (this.db.isLogin()) this.db.getChannels(this.db.getCurrentUserId())
    })

    effect(() => {
        this.messages_with_sender()
        queueMicrotask(() => {
            const el = this.chatHistory()?.nativeElement
            if (el) el.scrollTop = el.scrollHeight
        })
    })
}
active_content = computed(() => {
    if (this.active_type() === 'chat') return this.chat_content()
    if (this.active_type() === 'channel') return this.channel_content()
    return []
})

is_self_chat = computed(() => this.dm_partner()?.id === this.db.getCurrentUserId())

channel_creator = computed(() =>
    this.all_user().find(u => u.id === this.channel_info()?.created_by) ?? null)

messages_with_sender = computed(() =>
    this.active_content().map(message => ({
        message,
        sender: this.all_user().find(u => u.id === message.sender_id)
    }))
);

    toggleMenu(menu: 'dmOpen' | 'channelOpen' | 'workspace' | 'thread') {
        if (menu === 'dmOpen') this.dmOpen = !this.dmOpen;
        if (menu === 'channelOpen') this.channelOpen = !this.channelOpen;
        if (menu === 'workspace') this.workspace_Open = !this.workspace_Open;
        if (menu === 'thread') this.thread_Open = !this.thread_Open;
    }

    async open_Dm(id:string){
        this.active_type.set('chat')
        this.dm_partner.set(this.all_user().find(u => u.id === id) ?? null)

        const dm = await this.db.getChatId(id)
        this.chat_id = dm
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

    editChannel(data: { name: string; description: string }) {
        this.db.editChannel(this.channel_id, data.name, data.description)
    }

    leaveChannel() {
        this.db.removeChannelMember(this.channel_id, this.db.getCurrentUserId())
        this.dialog_mode.set(null)
        this.channel_id = ''
        this.channel_member_profiles.set([])
        this.active_type.set(null)
        this.db.getChannels(this.db.getCurrentUserId())
    }

    openProfileChat(id: string) {
        this.profile_user.set(null)
        this.dialog_mode.set(null)
        this.open_Dm(id)
    }

    send_Content(content:string){
        const type = this.active_type()
        if (!type) return

        const senderId = this.db.getCurrentUserId()
        const id = type === 'chat' ? this.chat_id : this.channel_id
        if (senderId)
            this.db.newMsg(type, null, id, senderId, content)
        else
            console.error('not sending')
    }



}



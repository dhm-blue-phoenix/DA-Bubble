import { Component, inject, signal, WritableSignal, computed, effect, viewChild, ElementRef } from '@angular/core';
import { Workspace } from '../../ui/workspace/workspace'
import { Channels } from '../../ui/channels/channels'
import { Chat } from '../../ui/chat/chat'
import { Thread } from '../../ui/thread/thread';
import { Input } from '../../ui/input/input';
import { ChatHeader } from '../../ui/chat-header/chat-header';
import { Database } from '../../../services/db';
import { DateSeparatorService } from '../../../services/date-separator';
import { Profile } from '../../../interfaces/profile';
import { Message } from '../../../interfaces/messages';
import { Dialogs } from '../../ui/dialogs/dialogs';
import { ChatPlaceholder } from '../../ui/chat-placeholder/chat-placeholder';


@Component({
  selector: 'app-main-component',
  imports: [Workspace, Channels, Chat, Input, Thread, ChatHeader, Dialogs, ChatPlaceholder],
  templateUrl: './main-component.html',
  styleUrl: './main-component.css',
})
export class MainComponent {

channelOpen = true
dmOpen = true
workspace_Open = true
thread_Open = false

db = inject(Database)
dateSeparator = inject(DateSeparatorService)

active_type: WritableSignal<'channel' | 'chat' | 'search' | null> = signal(null)
dm_partner: WritableSignal<Profile | null> = signal<Profile | null>(null)
dialog_mode: WritableSignal<'editChannel' | 'addChannel' | 'addMember' | 'members' | 'userProfile' | null> = signal(null)
profile_user: WritableSignal<Profile | null> = signal(null)
thread_root_id: WritableSignal<string | null> = signal(null)
thread_root = computed(() => {
    const id = this.thread_root_id()
    if (!id) return null
    return this.active_content().find(m => m.id === id) ?? null
})
thread_id = ''
thread_channel_name = ''

all_user = this.db.profiles
all_channels = this.db.channels
all_channel_members = ""

chat_content = this.db.chatMsg

channel_id = ''
chat_id = ''
channel_info = this.db.channel
channel_content = this.db.channelMsg

scrollToMessageId: string | null = null

chatHistory = viewChild<ElementRef<HTMLDivElement>>('chatHistory')

constructor(){
    effect(() => {
        if (this.db.isLogin()) this.db.getChannels(this.db.getCurrentUserId())
    })

    effect(() => {
    this.messages_with_sender()
    queueMicrotask(() => {
        const el = this.chatHistory()?.nativeElement
        if (!el) return

        if (this.scrollToMessageId) {
            const target = document.getElementById('msg-' + this.scrollToMessageId)
            if (target) {
                target.scrollIntoView({ block: 'center' })
                this.scrollToMessageId = null
                return
            }
        }

        el.scrollTop = el.scrollHeight
    })
})
    
}
active_content = computed(() => {
    if (this.active_type() === 'chat') return this.chat_content()
    if (this.active_type() === 'channel') return this.channel_content()
    if (this.active_type() === 'search') return []
    return []
})

is_self_chat = computed(() => this.dm_partner()?.id === this.db.getCurrentUserId())

channel_creator = computed(() =>
    this.all_user().find(user => user.id === this.channel_info()?.created_by) ?? null)

currentUser = computed(() =>
    this.all_user().find(user => user.id === this.db.getCurrentUserId()) ?? null)

channel_member_profiles = computed((): Profile[] => {
    const members = this.channel_info()?.channel_members ?? []
    return members
        .map(member => this.all_user().find(user => user.id === member.user_id))
        .filter((profile): profile is Profile => profile !== undefined)
})

messages_with_sender = computed(() =>
    this.dateSeparator.withSeparators(this.active_content()).map(item => ({
        ...item,
        sender: this.all_user().find(user => user.id === item.message.sender_id)
    }))
);

thread_root_sender = computed(() =>
    this.all_user().find(user => user.id === this.thread_root()?.sender_id))

thread_root_date_label = computed(() => {
    const root = this.thread_root()
    return root ? this.dateSeparator.label(root.created_at) : ''
})


thread_messages_with_sender = computed(() => {
    const replies = this.db.threadMsg().filter(message => message.id !== this.thread_root()?.id)
    return this.dateSeparator.withSeparators(replies).map(item => ({
        ...item,
        sender: this.all_user().find(user => user.id === item.message.sender_id)
    }))
});

    toggleMenu(menu: 'dmOpen' | 'channelOpen' | 'workspace' | 'thread') {
        if (menu === 'dmOpen') this.dmOpen = !this.dmOpen;
        if (menu === 'channelOpen') this.channelOpen = !this.channelOpen;
        if (menu === 'workspace') this.workspace_Open = !this.workspace_Open;
        if (menu === 'thread') this.thread_Open = !this.thread_Open;
    }

    async open_Dm(id:string){
        this.db.clearChatMessages()
        this.scrollToMessageId = null
        this.active_type.set('chat')
        this.dm_partner.set(this.all_user().find(user => user.id === id) ?? null)

        const dm = await this.db.getChatId(id)
        this.chat_id = dm
        this.db.loadMsg('chat', dm)
    }

    onOpenSelection(selection: { type: 'chat' | 'channel'; id: string ; messageId?: string }) {
        if (selection.type === 'chat') this.open_Dm(selection.id)
        else this.open_Chat(selection.id, selection.messageId)
    }

    open_Chat_By_Id(chatId: string, messageId:string) {
        this.db.clearChatMessages()
        this.active_type.set('chat')
        this.dm_partner.set(null)
        this.scrollToMessageId = messageId
        this.chat_id = chatId
        this.db.loadMsg('chat', chatId)
    }

    async open_Chat(id: string, messageId?:string) {
        this.active_type.set('channel')
        this.channel_id = id
        this.db.loadMsg('channel', id)
        this.scrollToMessageId = messageId ?? null
        await this.db.getChannelContent(id)
    }

    editChannel(data: { name: string; description: string }) {
        this.db.editChannel(this.channel_id, data.name, data.description)
    }

    leaveChannel() {
        this.db.removeChannelMember(this.channel_id, this.db.getCurrentUserId())
        this.dialog_mode.set(null)
        this.channel_id = ''
        this.active_type.set(null)
        this.db.getChannels(this.db.getCurrentUserId())
    }

    async openThread(messageId: string) {
        this.db.clearThreadMessages()
        this.thread_root_id.set(messageId)
        this.thread_channel_name = this.channel_info()?.name ?? ''
        this.thread_Open = true
        this.thread_id = await this.db.getThreadId(messageId)
        await this.db.loadMsg('thread', this.thread_id)

        const type = this.active_type()
        if (type === 'channel') await this.db.loadMsg('channel', this.channel_id)
        else if (type === 'chat') await this.db.loadMsg('chat', this.chat_id)
    }

    send_Thread_Content(content: string) {
        const senderId = this.db.getCurrentUserId()
        if (senderId && this.thread_id)
            this.db.newMsg('thread', this.channel_id, this.thread_id, senderId, content)
    }

    openProfileChat(id: string) {
        this.profile_user.set(null)
        this.dialog_mode.set(null)
        this.open_Dm(id)
    }

    openUserProfileDialog() {
        this.dialog_mode.set('userProfile')
    }

    saveProfileName(name: string) {
        const profile = this.currentUser()
        if (profile) this.db.editProfileName(profile.id, name)
        this.dialog_mode.set(null)
    }

    send_Content(content:string){
        const type = this.active_type()
        if (!type || type === 'search') return

        const senderId = this.db.getCurrentUserId()
        const id = type === 'chat' ? this.chat_id : this.channel_id
        if (senderId)
            this.db.newMsg(type, null, id, senderId, content)
        else
            console.error('not sending')
    }
}



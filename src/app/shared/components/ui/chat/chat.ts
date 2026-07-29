import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../../../interfaces/messages'
import { Profile } from '../../../interfaces/profile';
import { Database } from '../../../services/db';
import { MessageActions } from '../message-actions/message-actions';
import { MessageReactions } from '../message-reactions/message-reactions';

@Component({
  selector: 'app-chat',
  imports: [DatePipe, FormsModule, MessageActions, MessageReactions],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {
  @Input() message!: Message
  @Input() sender?: Profile
  @Input() context: 'channel' | 'chat' | 'thread' = 'channel'
  @Input() showSeparator = false
  @Input() dateLabel = ''

  @Output() openThread = new EventEmitter<string>()

  db = inject(Database)

  editing = false
  editDraft = ''

  isOwnMessage(): boolean {
    return this.message.sender_id === this.db.getCurrentUserId()
  }

  isThread(): boolean {
    return this.context === 'thread'
  }

  startEdit() {
    this.editDraft = this.message.content
    this.editing = true
  }

  cancelEdit() {
    this.editing = false
  }

  async saveEdit() {
    if (this.editDraft.trim() === "")
      return
    await this.db.editMsg(this.message.id, this.editDraft)
    this.editing = false
  }

  async react(emoji: number) {
    await this.db.toggleReaction(this.message.id, this.db.getCurrentUserId(), String(emoji))
  }
}

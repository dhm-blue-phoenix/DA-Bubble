import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../../../interfaces/messages'
import { Profile } from '../../../interfaces/profile';
import { Database } from '../../../services/db';

@Component({
  selector: 'app-chat',
  imports: [DatePipe, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {
  @Input() message!: Message
  @Input() sender?: Profile

  @Output() openThread = new EventEmitter<string>()

  db = inject(Database)

  editing = false
  editDraft = ''

  isOwnMessage(): boolean {
    return this.message.sender_id === this.db.getCurrentUserId()
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

  groupedReactions(): { emoji: string; count: number }[] {
    const counts = new Map<string, number>()
    for (const reaction of this.message.reactions) {
      counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1)
    }
    return Array.from(counts, ([emoji, count]) => ({ emoji, count }))
  }
}

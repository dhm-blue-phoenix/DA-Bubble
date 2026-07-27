import { Component, inject, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Message } from '../../../interfaces/messages'
import { Profile } from '../../../interfaces/profile';
import { Database } from '../../../services/db';

@Component({
  selector: 'app-chat',
  imports: [DatePipe],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {
  @Input() message!: Message
  @Input() sender?: Profile

  db = inject(Database)

  isOwnMessage(): boolean {
    return this.message.sender_id === this.db.getCurrentUserId()
  }

  async react(emoji: number): Promise<void> {
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

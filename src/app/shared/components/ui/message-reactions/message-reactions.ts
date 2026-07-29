import { Component, Input } from '@angular/core';
import { Reaction } from '../../../interfaces/messages';

@Component({
  selector: 'app-message-reactions',
  imports: [],
  templateUrl: './message-reactions.html',
  styleUrl: './message-reactions.css',
})
export class MessageReactions {
  @Input() reactions: Reaction[] = []
  @Input() reverse = false

  groupedReactions(): { emoji: string; count: number }[] {
    const counts = new Map<string, number>()
    for (const reaction of this.reactions) {
      counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1)
    }
    return Array.from(counts, ([emoji, count]) => ({ emoji, count }))
  }
}

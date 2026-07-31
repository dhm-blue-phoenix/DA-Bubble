import { Component, inject, Input } from '@angular/core';
import { Reaction } from '../../../interfaces/messages';
import { Database } from '../../../services/db';

const MAX_NAMES_SHOWN = 5

interface ReactionGroup {
  emoji: string
  count: number
  names: string[]
  extraCount: number
}

@Component({
  selector: 'app-message-reactions',
  imports: [],
  templateUrl: './message-reactions.html',
  styleUrl: './message-reactions.css',
})
export class MessageReactions {
  @Input() reactions: Reaction[] = []
  @Input() reverse = false

  db = inject(Database)

  groupedReactions(): ReactionGroup[] {
    const emojis = this.getUsedEmojis()
    return emojis.map(emoji => this.buildGroup(emoji))
  }

  reactionLabel(count: number): string {
    if (count === 1) 
      return'hat reagiert' 
    else
      return 'haben reagiert'
  }

  private getUsedEmojis(): string[] {
    const allEmojis = this.reactions.map(reaction => reaction.emoji)
    return [...new Set(allEmojis)]
  }

  private buildGroup(emoji: string): ReactionGroup {
    const reactionsForEmoji = this.reactions.filter(reaction => reaction.emoji === emoji)
    const names = reactionsForEmoji.map(reaction => this.getUserName(reaction.user_id))

    return {
      emoji,
      count: names.length,
      names: names.slice(0, MAX_NAMES_SHOWN),
      extraCount: Math.max(0, names.length - MAX_NAMES_SHOWN),
    }
  }

  private getUserName(userId: string): string {
    const profile = this.db.profiles().find(p => p.id === userId)
    return profile?.name ?? ''
  }
}

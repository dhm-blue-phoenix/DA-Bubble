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
}

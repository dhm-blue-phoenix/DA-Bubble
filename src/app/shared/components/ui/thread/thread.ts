import { Component, Input } from '@angular/core';
import { Chat } from '../chat/chat';
import { Message } from '../../../interfaces/messages';
import { Profile } from '../../../interfaces/profile';

@Component({
  selector: 'app-thread',
  imports: [Chat],
  templateUrl: './thread.html',
  styleUrl: './thread.css',
})
export class Thread {
  @Input() rootMessage: Message | null = null
  @Input() rootSender?: Profile
  @Input() messages: { message: Message; sender?: Profile }[] = []
}

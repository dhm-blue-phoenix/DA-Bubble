import { Component, Input } from '@angular/core';
import { Message } from '../../../interfaces/messages'

@Component({
  selector: 'app-chat',
  imports: [],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {
  @Input() message!: Message

}

import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-message-actions',
  imports: [],
  templateUrl: './message-actions.html',
  styleUrl: './message-actions.css',
})
export class MessageActions {
  @Input() isOwnMessage = false
  @Input() isThread = false

  @Output() react = new EventEmitter<number>()
  @Output() openThread = new EventEmitter<void>()
  @Output() edit = new EventEmitter<void>()
}

import { Component, Input, Output, EventEmitter, signal, WritableSignal } from '@angular/core';

@Component({
  selector: 'app-message-actions',
  imports: [],
  templateUrl: './message-actions.html',
  styleUrl: './message-actions.css',
})
export class MessageActions {
  @Input() isOwnMessage = false
  @Input() isThread = false
  @Input() isChannel = false

  @Output() react = new EventEmitter<number>()
  @Output() openThread = new EventEmitter<void>()
  @Output() edit = new EventEmitter<void>()

  quickOpen: WritableSignal<boolean> = signal(false)
  menuOpen: WritableSignal<boolean> = signal(false)

  toggleQuick(event: MouseEvent) {
    event.stopPropagation()
    this.quickOpen.update(open => !open)
  }

  toggleEditMenu(event: MouseEvent) {
    event.stopPropagation()
    this.menuOpen.update(open => !open)
  }
}

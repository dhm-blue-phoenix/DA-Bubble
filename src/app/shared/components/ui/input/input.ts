import { Component, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './input.html',
  styleUrl: './input.css',
})
export class Input {
  content = ''
  @Output() sent = new EventEmitter<string>()

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      import('emoji-picker-element')
    }
  }

  emoji_Dialog = false

    send() {
    if (!this.content.trim()) return
    this.sent.emit(this.content)
    this.content = ''
  }

  toggle_Emoji(){
    this.emoji_Dialog = !this.emoji_Dialog;
  }
}

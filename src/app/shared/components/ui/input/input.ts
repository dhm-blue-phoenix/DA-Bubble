import { Component, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA, inject, PLATFORM_ID, viewChild, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { EmojiClickEvent } from 'emoji-picker-element/shared';

@Component({
  selector: 'app-input',
  imports: [FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './input.html',
  styleUrl: './input.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Input {
  content = ''
  @Output() sent = new EventEmitter<string>()

  emoji_Dialog = false

  emojiWrapper = viewChild<ElementRef<HTMLElement>>('emojiWrapper')
  emojiButton = viewChild<ElementRef<HTMLElement>>('emojiButton')

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      import('emoji-picker-element')
    }
  }

  send() {
    if (!this.content.trim()) return
    this.sent.emit(this.content)
    this.content = ''
  }

  toggle_Emoji() {
    this.emoji_Dialog = !this.emoji_Dialog
  }

  addEmoji(event: EmojiClickEvent) {
    if (event.detail.unicode) this.content += event.detail.unicode
    this.emoji_Dialog = false
  }

  onDocumentClick(event: MouseEvent) {
    if (!this.emoji_Dialog) return
    const target = event.target as Node
    if (this.emojiWrapper()?.nativeElement.contains(target)) return
    if (this.emojiButton()?.nativeElement.contains(target)) return
    this.emoji_Dialog = false
  }
}

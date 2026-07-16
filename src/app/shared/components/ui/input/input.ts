import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [FormsModule],
  templateUrl: './input.html',
  styleUrl: './input.css',
})
export class Input {
  content = ''
  @Output() sent = new EventEmitter<string>()

    send() {
    if (!this.content.trim()) return
    this.sent.emit(this.content)
    this.content = ''
  }
}

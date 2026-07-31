import { Injectable } from '@angular/core';
import { Message, Messages } from '../interfaces/messages';

@Injectable({
  providedIn: 'root',
})
export class DateSeparatorService {
  isToday(dateStr: string): boolean {
    return new Date(dateStr).toDateString() === new Date().toDateString()
  }

  label(dateStr: string): string {
    if (this.isToday(dateStr)) return 'Heute'
    return new Date(dateStr).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  withSeparators(messages: Messages): { message: Message; showSeparator: boolean; dateLabel: string }[] {
    return messages.map((message, index) => ({
      message,
      showSeparator: index === 0 || !this.isSameDay(message.created_at, messages[index - 1].created_at),
      dateLabel: this.label(message.created_at),
    }))
  }

  private isSameDay(a: string, b: string): boolean {
    return new Date(a).toDateString() === new Date(b).toDateString()
  }
}

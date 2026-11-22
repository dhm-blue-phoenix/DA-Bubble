import { TestBed } from '@angular/core/testing';
import { Database } from '../../../services/db';
import { MessageReactions } from './message-reactions';

describe('MessageReactions', () => {
  it('renders the current user reaction as a focusable toggle', async () => {
    const database = {
      profiles: () => [],
      getCurrentUserId: () => 'user_1',
      toggleReaction: vi.fn().mockResolvedValue(null),
    };

    TestBed.configureTestingModule({
      imports: [MessageReactions],
      providers: [{ provide: Database, useValue: database }],
    });

    const fixture = TestBed.createComponent(MessageReactions);
    fixture.componentRef.setInput('messageId', 'message_1');
    fixture.componentRef.setInput('reactions', [{
      message_id: 'message_1',
      user_id: 'user_1',
      emoji: '1',
      created_at: '2026-06-28T12:00:00Z',
    }]);
    fixture.detectChanges();

    const reactionButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(reactionButton.getAttribute('aria-pressed')).toBe('true');

    reactionButton.focus();
    expect(document.activeElement).toBe(reactionButton);
    reactionButton.click();
    await fixture.whenStable();

    expect(database.toggleReaction).toHaveBeenCalledWith('message_1', 'user_1', '1');
  });
});

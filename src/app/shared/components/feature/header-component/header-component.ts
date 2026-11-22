import { Component, computed, inject, signal, WritableSignal, Output, EventEmitter, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Database } from '../../../services/db';
import { FormsModule, NgModel } from '@angular/forms';
import { ActiveService } from '../../../services/set_aktiv_service';
import { Profile } from '../../../interfaces/profile';
import { SignalChannel, ChannelIdAndName } from '../../../interfaces/db/db-channels';
import { MentionService, MentionController } from '../../../services/mention';
import { SelectionSuggestions } from '../../ui/selection-suggestions/selection-suggestions';
import { SearchSuggestions } from '../../ui/search-suggestions/search-suggestions';
import { SearchMessages, SearchResultView } from '../../../interfaces/messages'

interface RouterState {
  event: 'change_avatar';
  navigationId: number;
}

@Component({
  selector: 'app-header-component',
  imports: [FormsModule, SelectionSuggestions, SearchSuggestions],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {
  private readonly router: Router = inject(Router);

  ngOnInit() {
    const state: RouterState = history.state;
    if (state.event === 'change_avatar') {
      this.openProfile();
    }
  }

  dialog_open = false;

  @Output() openUserProfile = new EventEmitter<void>();

  searchResults: WritableSignal<SearchResultView[]> = signal([]);

  db = inject(Database);
  active = inject(ActiveService);

  currentUser = computed(
    () => this.db.profiles().find((p) => p.id === this.db.getCurrentUserId()) ?? null,
  );

  toggle_Dialog() {
    this.dialog_open = !this.dialog_open;
  }

  openProfile() {
    this.openUserProfile.emit();
    this.dialog_open = false;
  }

  logout() {
    this.db.logout();
    this.router.navigate(['/']);
  }

  @Input() type: 'channel' | 'chat' | 'search' | null = null;
  @Input() dmPartner: Profile | null = null;
  @Input() isSelfChat: boolean = false;
  @Input() channelInfo: SignalChannel = null;
  @Input() memberProfiles: Profile[] = [];

  @Output() openChannelInfo = new EventEmitter<void>();
  @Output() openAddMember = new EventEmitter<void>();
  @Output() openMembers = new EventEmitter<void>();
  @Output() openSelection = new EventEmitter<{
    type: 'chat' | 'channel';
    id: string;
    messageId?: string;
    threadId?: string;
  }>();
  @Output() openChatById = new EventEmitter<{ chatId: string; messageId: string; threadId?: string }>();

  mention: MentionController = inject(MentionService).createController(true);

  async onSearchFieldClick(input: HTMLInputElement) {
    this.mention.onInput(input);
    if (this.mention.trigger() === null && this.mention.text.length > 0) {
      const result = await this.db.searchMsg(this.mention.text);
      this.searchResults.set(result ? this.search_content(result) : []);
    } else this.searchResults.set([]);
  }

  onSelectProfile(profile: Profile) {
    this.mention.selectProfile(profile);
    this.openSelection.emit({ type: 'chat', id: profile.id });
  }

  onSelectChannel(channel: ChannelIdAndName) {
    this.mention.selectChannel(channel);
    this.openSelection.emit({ type: 'channel', id: channel.id });
  }

  closeSearchDropdown(searchWrapper: HTMLElement) {
    setTimeout(() => {
      if (searchWrapper.contains(document.activeElement)) return;
      this.mention.trigger.set(null);
      this.searchResults.set([]);
    }, 150);
  }

  onSelectSearchResult(result: SearchResultView) {
    this.searchResults.set([]);
    if (result.type === 'channel') {
      this.openSelection.emit({ type: 'channel', id: result.targetId, messageId: result.id, threadId: result.threadId ?? undefined });
    } else {
      this.openChatById.emit({ chatId: result.targetId, messageId: result.id, threadId: result.threadId ?? undefined });
    }
  }

  search_content(results: SearchMessages): SearchResultView[] {
    const views: SearchResultView[] = [];

    for (const message of results) {
      const date = new Date(message.created_at).toLocaleDateString('de-DE');

      if (message.channel_id) {
        const channel = this.db.channels().find((channel) => channel.id === message.channel_id);
        if (channel === undefined) continue;
        this.push_to_channel(views, message, date, channel);
      } else if (message.chat_id) this.push_to_chat(views, message, date);
    }
    return views;
  }

  push_to_channel(
    views: SearchResultView[],
    message: SearchMessages[number],
    date: string,
    channel: ChannelIdAndName,
  ) {
    views.push({
      id: message.id,
      content: message.content,
      label: `# ${channel.name}`,
      date,
      type: 'channel',
      targetId: channel.id,
      threadId: message.thread_id,
    });
  }

  push_to_chat(views: SearchResultView[], message: SearchMessages[number], date: string) {
    views.push({
      id: message.id,
      content: message.content,
      label: 'Direktnachricht',
      date,
      type: 'chat',
      targetId: message.chat_id!,
      threadId: message.thread_id,
    });
  }
}

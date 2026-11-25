import { afterNextRender, Component, computed, inject, Injector, signal, WritableSignal, Output, EventEmitter, Input, ElementRef, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Database } from '../../../services/db';
import { FormsModule, NgModel } from '@angular/forms';
import { ActiveService } from '../../../services/set_aktiv_service';
import { Profile } from '../../../interfaces/profile';
import { SignalChannel, ChannelIdAndName } from '../../../interfaces/db/db-channels';
import { MentionService, MentionController } from '../../../services/mention';
import { SelectionSuggestions } from '../../ui/selection-suggestions/selection-suggestions';
import { SearchSuggestions } from '../../ui/search-suggestions/search-suggestions';
import { SearchMessages, SearchResultView } from '../../../interfaces/messages'

@Component({
  selector: 'app-header-component',
  imports: [FormsModule, SelectionSuggestions, SearchSuggestions],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:focusin)': 'onDocumentFocus($event)',
  },
})
export class HeaderComponent {
  private readonly router: Router = inject(Router);
  private readonly location: Location = inject(Location);
  private readonly injector: Injector = inject(Injector);
  private readonly searchWrapper = viewChild<ElementRef<HTMLElement>>('searchWrapper');
  private readonly searchWrapperMobile = viewChild<ElementRef<HTMLElement>>('searchWrapperMobile');

  ngOnInit() {
    const state: unknown = this.location.getState();
    if (state && typeof state === 'object' && 'event' in state && state.event === 'change_avatar') {
      this.openProfile();
    }
  }

  dialog_open = false;

  @Output() openUserProfile = new EventEmitter<void>();

  searchResults: WritableSignal<SearchResultView[]> = signal([]);
  private searchRequestId = 0;
  private searchPending = false;
  private pendingTabToResults = false;

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
    const requestId = ++this.searchRequestId;
    this.mention.onInput(input);
    if (this.mention.trigger() === null && this.mention.text.trim().length > 0) {
      this.searchPending = true;
      const result = await this.db.searchMsg(this.mention.text);
      if (requestId !== this.searchRequestId) return;
      this.searchPending = false;
      this.searchResults.set(result ? this.search_content(result) : []);
      if (this.pendingTabToResults) {
        this.pendingTabToResults = false;
        afterNextRender(() => this.focusSearchResult(input), { injector: this.injector });
      }
    } else {
      this.searchPending = false;
      this.pendingTabToResults = false;
      this.searchResults.set([]);
    }
  }

  onSearchKeydown(event: KeyboardEvent, searchWrapper: HTMLElement) {
    if (event.key !== 'Tab' || event.shiftKey || !this.searchPending || this.searchResults().length > 0) return;

    const target = event.target;
    const input = searchWrapper.querySelector('input');
    const searchButton = searchWrapper.querySelector('button[aria-label="Suche ausführen"]');
    if (target !== input && target !== searchButton) return;

    event.preventDefault();
    this.pendingTabToResults = true;
  }

  private focusSearchResult(input: HTMLInputElement) {
    const wrapper = input.closest<HTMLElement>('[role="search"]');
    const firstResult = wrapper?.querySelector<HTMLButtonElement>('.search_result_button');
    if (firstResult) {
      firstResult.focus();
      return;
    }
    wrapper?.querySelector<HTMLButtonElement>('[aria-label="Suche ausführen"]')?.focus();
  }

  onSelectProfile(profile: Profile) {
    this.mention.selectProfile(profile);
    this.openSelection.emit({ type: 'chat', id: profile.id });
  }

  onSelectChannel(channel: ChannelIdAndName) {
    this.mention.selectChannel(channel);
    this.openSelection.emit({ type: 'channel', id: channel.id });
  }

  onDocumentFocus(event: FocusEvent) {
    if (this.isWithinSearchWrapper(event.target)) return;
    this.clearSearchDropdown();
  }

  onDocumentClick(event: MouseEvent) {
    if (this.isWithinSearchWrapper(event.target)) return;
    this.clearSearchDropdown();
  }

  private isWithinSearchWrapper(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) return false;
    return this.searchWrapper()?.nativeElement.contains(target) === true
      || this.searchWrapperMobile()?.nativeElement.contains(target) === true;
  }

  private clearSearchDropdown() {
    this.searchRequestId++;
    this.searchPending = false;
    this.pendingTabToResults = false;
    this.mention.trigger.set(null);
    this.searchResults.set([]);
  }

  onSelectSearchResult(result: SearchResultView) {
    this.clearSearchDropdown();
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

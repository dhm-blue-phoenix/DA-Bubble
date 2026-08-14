import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { Database } from './db';
import { Profile } from '../interfaces/profile';
import { ChannelIdAndName } from '../interfaces/db/db-channels';

export interface MentionTrigger {
  trigger: '#' | '@'
  query: string
  start: number
}

@Injectable({
  providedIn: 'root',
})
export class MentionService {
  private db = inject(Database)

  filterProfiles(query: string, matchEmail = false): Profile[] {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    const profiles = this.db.profiles()
    const startsWith = profiles.filter(profile =>
      profile.name.toLowerCase().startsWith(normalizedQuery) ||
      (matchEmail && profile.email.toLowerCase().startsWith(normalizedQuery))
    )
    const includes = profiles.filter(profile =>
      !startsWith.includes(profile) &&
      (profile.name.toLowerCase().includes(normalizedQuery) ||
        (matchEmail && profile.email.toLowerCase().includes(normalizedQuery)))
    )
    return [...startsWith, ...includes]
  }

  filterProfilesByEmail(query: string): Profile[] {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    const profiles = this.db.profiles()
    const startsWith = profiles.filter(profile => profile.email.toLowerCase().startsWith(normalizedQuery))
    const includes = profiles.filter(profile => !startsWith.includes(profile) && profile.email.toLowerCase().includes(normalizedQuery))
    return [...startsWith, ...includes]
  }

  filterChannels(query: string): ChannelIdAndName[] {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    const channels = this.db.channels()
    const startsWith = channels.filter(channel => channel.name.toLowerCase().startsWith(normalizedQuery))
    const includes = channels.filter(channel => !startsWith.includes(channel) && channel.name.toLowerCase().includes(normalizedQuery))
    return [...startsWith, ...includes]
  }

  detectTrigger(text: string, cursorPosition: number, requireStart = false): MentionTrigger | null {
    const textBeforeCursor = text.slice(0, cursorPosition)

    let triggerIndex = textBeforeCursor.length - 1
    while (
      triggerIndex >= 0 &&
      !/\s/.test(textBeforeCursor[triggerIndex]) &&
      textBeforeCursor[triggerIndex] !== '#' &&
      textBeforeCursor[triggerIndex] !== '@'
    ) {
      triggerIndex--
    }

    const characterAtTriggerIndex = textBeforeCursor[triggerIndex]
    if (triggerIndex < 0 || (characterAtTriggerIndex !== '#' && characterAtTriggerIndex !== '@')) return null
    if (requireStart && triggerIndex !== 0) return null

    const trigger = characterAtTriggerIndex as '#' | '@'
    const query = textBeforeCursor.slice(triggerIndex + 1)
    return { trigger, query, start: triggerIndex }
  }

  allProfiles(): Profile[] {
    return this.db.profiles()
  }

  allChannels(): ChannelIdAndName[] {
    return this.db.channels()
  }

  createController(requireStartTrigger = false): MentionController {
    return new MentionController(this, requireStartTrigger)
  }
}
export class MentionController {
  constructor(private mentionService: MentionService, private requireStartTrigger = false) {}

  text = ''
  trigger: WritableSignal<MentionTrigger | null> = signal(null)

  onInput(input: HTMLInputElement | HTMLTextAreaElement) {
    this.text = input.value
    const cursorPosition = input.selectionStart ?? input.value.length
    this.trigger.set(this.mentionService.detectTrigger(input.value, cursorPosition, this.requireStartTrigger))
  }

  profileSuggestions(matchEmail = false): Profile[] {
    const activeTrigger = this.trigger()
    if (!activeTrigger || activeTrigger.trigger !== '@') return []
    return activeTrigger.query
      ? this.mentionService.filterProfiles(activeTrigger.query, matchEmail)
      : this.mentionService.allProfiles()
  }

  emailSuggestions(): Profile[] {
    if (this.trigger()) return []
    return this.mentionService.filterProfilesByEmail(this.text)
  }

  channelSuggestions(): ChannelIdAndName[] {
    const activeTrigger = this.trigger()
    if (!activeTrigger || activeTrigger.trigger !== '#') return []
    return activeTrigger.query
      ? this.mentionService.filterChannels(activeTrigger.query)
      : this.mentionService.allChannels()
  }

  selectProfile(profile: Profile) {
    this.insertSelection('@', profile.name)
  }

  selectChannel(channel: ChannelIdAndName) {
    this.insertSelection('#', channel.name)
  }

  private insertSelection(prefix: string, name: string) {
    const activeTrigger = this.trigger()
    const start = activeTrigger ? activeTrigger.start : 0
    const end = activeTrigger ? activeTrigger.start + 1 + activeTrigger.query.length : this.text.length

    const textBeforeTrigger = this.text.slice(0, start)
    const textAfterQuery = this.text.slice(end)
    this.text = `${textBeforeTrigger}${prefix}${name} ${textAfterQuery}`
    this.trigger.set(null)
  }
}

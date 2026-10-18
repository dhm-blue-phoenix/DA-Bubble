# Datenbank API Dokumentation

Dieses Dokument beschreibt die öffentliche API, die Realtime-Synchronisierung und die Fehlerbehandlung der Datenbank-Services in `DA-Bubble`. Es richtet sich an Entwickler, die verstehen möchten, wie die Anwendung mit Supabase kommuniziert.

Der Haupt-Service `Database` (`src/app/shared/services/db.ts`) dient als zentrale Fassade für die Anwendung. Sämtliche spezifischen Fach-Services befinden sich im Unterverzeichnis `src/app/shared/services/db/`.

---

## 0. Haupt-Service: Database (`db.ts`)
Fassade/Aggregator für die Datenbank-Funktionen. Bündelt die Sub-Services und stellt Read-Only Angular Signals für Komponenten bereit. Die meisten asynchronen Fassade-Methoden verwenden `safeCall`; Besonderheiten und Ausnahmen sind unter [Error-Handling Strategie](#error-handling-strategie) aufgeführt.

### Exponierte Read-Only Signals
- `profiles`: `Signal<Profiles>` - Alle geladenen Benutzerprofile.
- `isLogin`: `Signal<boolean>` - Anmeldestatus des Benutzers.
- `chatMsg`: `Signal<Messages>` - Nachrichten des aktuellen Chats.
- `channelMsg`: `Signal<Messages>` - Nachrichten des aktuellen Kanals.
- `threadMsg`: `Signal<Messages>` - Nachrichten des aktuellen Threads.
- `channels`: `Signal<SignalChannels>` - Kanäle, in denen der Benutzer Mitglied ist.
- `channel`: `Signal<SignalChannel>` - Detaillierte Daten des geöffneten Kanals.

### Methoden
- **`getCurrentUserId()`**: `string` – Liefert die ID des angemeldeten Benutzers.
- **`register(user_email, user_password, user_name, user_avatar)`**: `Promise<false | void>` – Registriert einen Benutzer; `false` bei bereits verwendeter E-Mail oder einem abgefangenen Fehler, andernfalls `undefined` bei Erfolg. Bei erfolgreicher Registrierung wird die Seite neu geladen.
- **`login(user_email, user_password)`**: `Promise<boolean>` – Meldet einen Benutzer mit E-Mail & Passwort an; `true` bei Erfolg, `false` bei einem abgefangenen Fehler.
- **`loginWithGoogle()`**: `Promise<void>` – Meldet den Benutzer über Google OAuth an.
- **`logout()`**: `Promise<void>` – Meldet den Benutzer ab und setzt alle Signals zurück.
- **`checkExistEmailForNewUser(email)`**: `Promise<boolean>` – Prüft, ob die E-Mail bereits registriert ist; bei einem abgefangenen Fehler ist das Ergebnis `false`.
- **`sendEmailForPasswordReset(email)`**: `Promise<void>` – Sendet E-Mail zum Passwort-Zurücksetzen.
- **`updatePassword(newPassword)`**: `Promise<void>` – Ändert das Passwort des Benutzers.
- **`getProfile(profileId)`**: `Promise<Profile | null>` – Lädt ein Profil anhand der ID.
- **`editProfileName(profileId, value)`**: `Promise<void>` – Ändert den Anzeigenamen.
- **`editProfileAvatar(value)`**: `Promise<void>` – Ändert das Avatar des aktuell angemeldeten Benutzers.
- **`getChatId(otherUserId)`**: `Promise<string>` – Liefert oder erstellt die Chat-ID für einen 1-zu-1 Chat.
- **`newMsg(msgType, threadChannelId, id, senderId, content)`**: `Promise<void>` – Erstellt eine neue Nachricht.
- **`editMsg(msgId, newContent)`**: `Promise<void>` – Bearbeitet den Inhalt einer Nachricht.
- **`loadMsg(msgType, id)`**: `Promise<void>` – Lädt Nachrichten für Chat, Channel oder Thread.
- **`toggleReaction(msgId, senderId, emoji)`**: `Promise<ReactionResult | null>` – Umschaltet eine Emoji-Reaktion (`{ action: 'added' | 'removed' }`); `null` bei einem abgefangenen Fehler.
- **`newChannel(userId, title, desc)`**: `Promise<boolean>` – Erstellt einen neuen Kanal; `false` bei Namens-Duplikat oder einem abgefangenen Fehler.
- **`editChannel(channelId, title, desc)`**: `Promise<void>` – Aktualisiert Name und Beschreibung eines Kanals.
- **`addChannelMember(channelId, userId)`**: `Promise<void>` – Fügt ein Mitglied zu einem Kanal hinzu.
- **`removeChannelMember(channelId, userId)`**: `Promise<void>` – Entfernt ein Mitglied aus einem Kanal.
- **`getChannels(userId)`**: `Promise<void>` – Lädt alle Kanal-Mitgliedschaften des Benutzers.
- **`getChannelContent(channelId)`**: `Promise<void>` – Lädt Kanal-Details.
- **`getThreadId(messageId)`**: `Promise<string>` – Holt oder erstellt einen Diskussions-Thread zu einer Nachricht.
- **`clearChatMessages()`**: `void` – Leert das Nachrichten-Signal des aktuellen Chats.
- **`clearThreadMessages()`**: `void` – Leert das Nachrichten-Signal des aktuellen Threads.

---

## 1. DatabaseAuth (`db-auth.ts`)
Verwaltet die Authentifizierung der Benutzer, OAuth-Provider sowie den Online-/Offline-/Away-Status.

### `signUpNewUser`
- **Zweck:** Registriert einen neuen Benutzer mit E-Mail und Passwort.
- **Eingabe:** `user_email` (string), `user_password` (string), `user_name` (string), `user_avatar` (string)
- **Ausgabe:** `Promise<false | void>` (Gibt `false` zurück, wenn die E-Mail bereits existiert; bei Erfolg wird kein Wert zurückgegeben und die Seite neu geladen.)
- **Fehler:** Wirft ein `Error` Objekt bei Supabase Auth-Fehlern.

### `signInWithEmail`
- **Zweck:** Loggt einen bestehenden Benutzer mit E-Mail und Passwort ein.
- **Eingabe:** `user_email` (string), `user_password` (string)
- **Ausgabe:** `Promise<void>`

### `signInWithGoogle`
- **Zweck:** Startet den Google OAuth Login-Flow via Supabase.
- **Eingabe:** Keine.
- **Ausgabe:** `Promise<void>`

### `signOut`
- **Zweck:** Loggt den aktuellen Benutzer aus und setzt seinen Status auf `offline`.
- **Eingabe:** Keine.
- **Ausgabe:** `Promise<void>`

### `resetPasswordForEmail`
- **Zweck:** Sendet eine E-Mail zum Zurücksetzen des Passworts mit Redirect-Link.
- **Eingabe:** `email` (string)
- **Ausgabe:** `Promise<void>`

### `changePassword`
- **Zweck:** Aktualisiert das Passwort des aktuell angemeldeten Benutzers.
- **Eingabe:** `newPassword` (string)
- **Ausgabe:** `Promise<void>`

### `checkEmailExists`
- **Zweck:** Prüft, ob eine E-Mail-Adresse bereits in der `profiles`-Tabelle existiert.
- **Eingabe:** `email` (string)
- **Ausgabe:** `Promise<boolean>`

### Status und Session
- Beim Auth-State-Change speichert der Service die aktuelle User-ID und setzt den Login-Status.
- Bei Initial Session und Anmeldung wird der Profilstatus auf `online` gesetzt. Fenster-Fokus und -Verlust setzen ihn auf `online` beziehungsweise `away`; beim Abmelden wird er auf `offline` gesetzt.
- Die Profil-Updates zu Fokus, Fensterstatus und Abmeldung werden in `profiles.status` gespeichert.

### `getCurrentUserId`
- **Zweck:** Gibt die im Service gespeicherte Profil-ID des aktuell angemeldeten Benutzers zurück.
- **Eingabe:** Keine.
- **Ausgabe:** `string`

---

## 2. DatabaseChannels (`db-channels.ts`)
Verwaltet Kanäle (Channels) und deren Mitglieder. Hält über Angular Signals den Zustand durch Supabase Realtime aktuell. Im Browser abonniert der Service Änderungen an `channels` und `channel_members`; auf dem Server wird kein Realtime-Channel angelegt.

### `getChannelIds`
- **Zweck:** Lädt alle Channel-IDs und Namen, in denen der Benutzer Mitglied ist, in das `_channels` Signal.
- **Eingabe:** `userId` (string)
- **Ausgabe:** `Promise<void>`

### `getChannelData`
- **Zweck:** Lädt alle detaillierten Daten eines Kanals inkl. Mitgliedern in das `_channel` Signal.
- **Eingabe:** `channelId` (string)
- **Ausgabe:** `Promise<void>`

### `createNewChannel`
- **Zweck:** Erstellt einen neuen Kanal und fügt den Ersteller als 'admin' hinzu.
- **Eingabe:** `userId` (string), `name` (string), `description` (string)
- **Ausgabe:** `Promise<boolean>` (Gibt `false` zurück, wenn der Name bereits existiert, ansonsten `true`).

### `createNewMember`
- **Zweck:** Fügt einen Benutzer zu einem Kanal mit einer Rolle hinzu.
- **Eingabe:** `channelId` (string), `userId` (string), `role` ('admin' | 'member')
- **Ausgabe:** `Promise<void>`

### `removeMember`
- **Zweck:** Entfernt einen Benutzer aus einem Kanal.
- **Eingabe:** `channelId` (string), `userId` (string)
- **Ausgabe:** `Promise<void>`

### `updateChannelData`
- **Zweck:** Aktualisiert Name und Beschreibung eines bestehenden Kanals.
- **Eingabe:** `channelId` (string), `name` (string), `description` (string)
- **Ausgabe:** `Promise<void>`

---

## 3. DatabaseChats (`db-chats.ts`)
Verwaltet direkte 1-zu-1 Chats zwischen Benutzern.

### `getChatId`
- **Zweck:** Prüft, ob bereits ein Chat zwischen zwei Benutzern existiert. Wenn nicht, wird ein neuer Chat inklusive Mitgliedereinträgen erstellt.
- **Eingabe:** `currentUserId` (string), `otherUserId` (string)
- **Ausgabe:** `Promise<string>` (Gibt die `chat_id` zurück)

---

## 4. DatabaseMessageHelper (`db-message-helper.ts`)
Hilfs-Service für Nachrichtenprüfung und Browser-Benachrichtigungen. Diese Benachrichtigungen werden nur verarbeitet, solange die Browser-Anwendung läuft und die Realtime-Verbindung aktiv ist; Web Push im Hintergrund oder bei geschlossenem Browser ist nicht implementiert.

### `checkChat`
- **Zweck:** Prüft, ob eine Nachricht zur aktuell geöffneten Chat-ID gehört.
- **Eingabe:** `chatId` (string), `message` (Message)
- **Ausgabe:** `boolean`

### `checkCurrentChat`
- **Zweck:** Ignoriert Nachrichten des eigenen Benutzers, prüft bei Chat-, Kanal- und Thread-Nachrichten die Mitgliedschaft des angemeldeten Benutzers und zeigt bei Bedarf eine Browser-Notification an. Thread-Zuordnungen werden bei Bedarf über die `threads`-Tabelle aufgelöst.
- **Eingabe:** `message` (Message)
- **Ausgabe:** `Promise<void>`

### `requestNotificationPermission`
- **Zweck:** Fragt die Browser-Berechtigung für Notifications ab, sofern sie noch `default` ist.
- **Eingabe:** Keine.
- **Ausgabe:** `Promise<NotificationPermission>` (`'granted'`, `'denied'` oder `'default'`; `'denied'`, wenn die Browser-API nicht verfügbar ist.)

### `setBrowserNotification`
- **Zweck:** Fordert bei Status `default` eine Berechtigung an und erzeugt bei Status `granted` eine Browser-Notification. Bei fehlender API oder nicht erteilter Berechtigung wird keine Notification erzeugt.
- **Eingabe:** `title` (string), `description` (string)
- **Ausgabe:** `Promise<void>`

---

## 5. DatabaseMessages (`db-messages.ts`)
Verwaltet das Senden, Empfangen und Bearbeiten von Nachrichten sowie Emoji-Reaktionen. Im Browser abonniert der Service Realtime-Änderungen an `messages` und `reactions`; auf dem Server wird kein Realtime-Channel angelegt. Neue Direktchat-Nachrichten gelangen nur dann ins Chat-Signal, wenn ihre `chat_id` der aktuellen Chat-ID entspricht. Kanalnachrichten ohne `thread_id` werden ins Kanal-Signal und Nachrichten mit `thread_id` ins Thread-Signal eingefügt; diese beiden Signal-Updates filtern nicht nach der aktuell geöffneten Kanal- beziehungsweise Thread-ID. Updates und Reaktionen werden auf den jeweils vorhandenen Signal-Listen angewendet. Bei einem neuen Nachrichten-Event wird außerdem `checkCurrentChat` für Browser-Notifications aufgerufen.

### `getMessages`
- **Zweck:** Lädt Nachrichten für Chat, Channel oder Thread sortiert nach Erstellungsdatum.
- **Eingabe:** `msgType` ('chat' | 'channel' | 'thread'), `id` (string)
- **Ausgabe:** `Promise<void>` (Aktualisiert das jeweilige Signal `_chat_messages`, `_channel_messages` oder `_thread_messages`; lädt Reaktionen mit und ergänzt bei Nachrichten mit Thread die Antwortanzahl.)

### `createNewMessage`
- **Zweck:** Erstellt eine neue Nachricht in der Datenbank.
- **Eingabe:** `msgType` (MsgType), `threadChannelId` (string | null), `id` (string), `senderId` (string), `content` (string)
- **Ausgabe:** `Promise<void>`

### `updateMessage`
- **Zweck:** Aktualisiert den Nachrichtentext und setzt `edited_at`.
- **Eingabe:** `messageId` (string), `newContent` (string)
- **Ausgabe:** `Promise<void>`

### `toggleReaction`
- **Zweck:** Schaltet eine Emoji-Reaktion um (fügt sie hinzu oder löscht sie).
- **Eingabe:** `messageId` (string), `userId` (string), `emoji` (string)
- **Ausgabe:** `Promise<ReactionResult>` (`{ action: 'added' | 'removed' }`)

### `searchMessages`
- **Zweck:** Sucht case-insensitive nach Nachrichten, deren Inhalt den Suchbegriff enthält. Gibt höchstens 100 Treffer zurück, neueste zuerst.
- **Eingabe:** `value` (string)
- **Ausgabe:** `Promise<SearchMessages>` (`{ id, content, channel_id, chat_id, thread_id, created_at }[]`)

---

## 6. DatabaseProfiles (`db-profiles.ts`)
Verwaltet Benutzerprofile und synchronisierte Status-Updates. Im Browser abonniert der Service Realtime-Änderungen an `profiles` und aktualisiert das Profile-Signal bei Inserts und Updates.

### `getProfiles`
- **Zweck:** Lädt alle Benutzerprofile aus der Datenbank in das `_profiles` Signal.
- **Eingabe:** Keine.
- **Ausgabe:** `Promise<void>`

### `getProfile`
- **Zweck:** Lädt die Profildaten eines spezifischen Benutzers.
- **Eingabe:** `profileId` (string)
- **Ausgabe:** `Promise<Profile | null>`

### `updateProfileName`
- **Zweck:** Ändert den Anzeigenamen eines Benutzers in der Datenbank.
- **Eingabe:** `profileId` (string), `value` (string)
- **Ausgabe:** `Promise<void>`

### `updateProfileAvatar`
- **Zweck:** Ändert das Profilbild (Avatar) eines Benutzers.
- **Eingabe:** `profileId` (string), `value` (string)
- **Ausgabe:** `Promise<void>`

Der Profile-Helper aktualisiert `profiles.last_seen` alle 30 Sekunden, solange eine Realtime-Subscription den Status `SUBSCRIBED` meldet und ein Benutzer angemeldet ist.

---

## 7. DatabaseThreads (`db-threads.ts`)
Verwaltet Antwort-Stränge (Threads) zu Ursprungs-Nachrichten.

### `getThreadId`
- **Zweck:** Ermittelt die Thread-ID zu einer Ursprungs-Nachricht. Erstellt bei Bedarf einen neuen Thread-Eintrag und verknüpft die Ursprungsnachricht.
- **Eingabe:** `msgId` (string - ID der Ursprungsnachricht)
- **Ausgabe:** `Promise<string>` (Gibt die `thread_id` zurück)

### `getThreadMessageCount`
- **Zweck:** Zählt Nachrichten, die zu einem Thread gehören.
- **Eingabe:** `threadId` (string)
- **Ausgabe:** `Promise<number>`

---

## Error-Handling Strategie
1. **Low-Level Supabase Fehler (Sub-Services):**
   Die meisten Sub-Service-Abfragen prüfen den Supabase-Fehler und werfen bei einem Fehler eine Exception in folgendem Format:
   ```ts
   throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
   ```
   Nicht jede interne Operation verwendet dieses Format; zum Beispiel wirft `DatabaseChats.createNewChat` das Supabase-Fehlerobjekt direkt weiter.
2. **Haupt-Service Fassade (`db.ts`):**
   Die meisten asynchronen Fassade-Methoden umschließen Sub-Service-Aufrufe mit `safeCall`. Im Fehlerfall wird der Fehler mit `console.error` protokolliert und ein methodenspezifischer Fallback zurückgegeben (zum Beispiel `false`, `null`, `[]`, `''` oder `undefined`). Der Rückgabewert allein unterscheidet daher nicht immer einen fachlichen Negativfall von einem Fehler.
3. **Ausnahme `newMsg`:**
   Beim Senden einer Kanalnachricht prüft `newMsg` vor dem Aufruf von `safeCall`, ob der Absender laut aktuell geladenem Kanal-Signal Mitglied ist. Ist das nicht der Fall, wird ein Fehler geworfen und nicht durch `safeCall` abgefangen. Für Thread- und Direktnachrichten findet diese Fassade-Prüfung nicht statt.
4. **Browser-Benachrichtigungen:**
   Fehler beim Laden der Mitgliedschaften für Benachrichtigungen werden in `checkCurrentChat` nicht weitergereicht. Browser-Notifications setzen außerdem eine verfügbare Notification-API und eine erteilte Berechtigung voraus. `requestNotificationPermission()` existiert als Hilfsmethode; die aktuelle Nachrichtenverarbeitung fordert die Berechtigung bei Bedarf erst beim Anzeigen einer Notification an.

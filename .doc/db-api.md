# Datenbank API Dokumentation

Dieses Dokument beschreibt alle Eingaben, Ausgaben (Responses) und die Fehlerbehandlungsstrategie der Datenbank-Services in `DA-Bubble`. Es richtet sich an Entwickler, die verstehen möchten, wie mit der Supabase-Datenbank kommuniziert wird.

Der Haupt-Service `Database` (`src/app/shared/services/db.ts`) dient als zentrale Fassade für die Anwendung. Sämtliche spezifischen Fach-Services befinden sich im Unterverzeichnis `src/app/shared/services/db/`.

---

## 0. Haupt-Service: Database (`db.ts`)
Fassade/Aggregator für alle Datenbank-Funktionen. Bündelt die Sub-Services und stellt Read-Only Angular Signals für Komponenten bereit. Sämtliche asynchronen Methoden werden intern über `safeCall` abgesichert.

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
- **`register(user_email, user_password, user_name, user_avatar)`**: `Promise<boolean>` – Registriert einen Benutzer (gibt `false` bei E-Mail-Duplikat zurück).
- **`login(user_email, user_password)`**: `Promise<void>` – Meldet einen Benutzer mit E-Mail & Passwort an.
- **`loginWithGoogle()`**: `Promise<void>` – Meldet den Benutzer über Google OAuth an.
- **`logout()`**: `Promise<void>` – Meldet den Benutzer ab und setzt alle Signals zurück.
- **`sendEmailForPasswordReset(email)`**: `Promise<void>` – Sendet E-Mail zum Passwort-Zurücksetzen.
- **`updatePassword(newPassword)`**: `Promise<void>` – Ändert das Passwort des Benutzers.
- **`getProfile(profileId)`**: `Promise<Profile | null>` – Lädt ein Profil anhand der ID.
- **`editProfileName(profileId, value)`**: `Promise<void>` – Ändert den Anzeigenamen.
- **`editProfileAvatar(profileId, value)`**: `Promise<void>` – Ändert das Profilbild.
- **`getChatId(otherUserId)`**: `Promise<string>` – Liefert oder erstellt die Chat-ID für einen 1-zu-1 Chat.
- **`newMsg(msgType, threadChannelId, id, senderId, content)`**: `Promise<void>` – Erstellt eine neue Nachricht.
- **`editMsg(msgId, newContent)`**: `Promise<void>` – Bearbeitet den Inhalt einer Nachricht.
- **`loadMsg(msgType, id)`**: `Promise<void>` – Lädt Nachrichten für Chat, Channel oder Thread.
- **`toggleReaction(msgId, senderId, emoji)`**: `Promise<ReactionResult | null>` – Umschaltet eine Emoji-Reaktion (`added` oder `removed`).
- **`newChannel(userId, title, desc)`**: `Promise<boolean>` – Erstellt einen neuen Kanal (gibt `false` bei Namens-Duplikat zurück).
- **`editChannel(channelId, title, desc)`**: `Promise<void>` – Aktualisiert Name und Beschreibung eines Kanals.
- **`addChannelMember(channelId, userId)`**: `Promise<void>` – Fügt ein Mitglied zu einem Kanal hinzu.
- **`removeChannelMember(channelId, userId)`**: `Promise<void>` – Entfernt ein Mitglied aus einem Kanal.
- **`getChannels(userId)`**: `Promise<void>` – Lädt alle Kanal-Mitgliedschaften des Benutzers.
- **`getChannelContent(channelId)`**: `Promise<void>` – Lädt Kanal-Details.
- **`getThreadId(messageId)`**: `Promise<string>` – Holt oder erstellt einen Diskussions-Thread zu einer Nachricht.

---

## 1. DatabaseAuth (`db-auth.ts`)
Verwaltet die Authentifizierung der Benutzer, OAuth-Provider sowie den Online-/Offline-/Away-Status.

### `signUpNewUser`
- **Zweck:** Registriert einen neuen Benutzer mit E-Mail und Passwort.
- **Eingabe:** `user_email` (string), `user_password` (string), `user_name` (string), `user_avatar` (string)
- **Ausgabe:** `Promise<boolean>` (Gibt `false` zurück, wenn die E-Mail bereits existiert, ansonsten `true`).
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

### `getCurrentUserId`
- **Zweck:** Gibt die im Service gespeicherte Profil-ID des aktuell angemeldeten Benutzers zurück.
- **Eingabe:** Keine.
- **Ausgabe:** `string`

---

## 2. DatabaseChannels (`db-channels.ts`)
Verwaltet Kanäle (Channels) und deren Mitglieder. Hält über Angular Signals den Zustand synchron (Supabase Realtime).

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
Hilfs-Service für Nachrichtenvalidierung und Browser-Benachrichtigungen.

### `checkChat`
- **Zweck:** Prüft, ob eine Nachricht zur aktuell geöffneten Chat-ID gehört.
- **Eingabe:** `chatId` (string), `message` (Message)
- **Ausgabe:** `boolean`

### `checkCurrentChat`
- **Zweck:** Prüft, ob der angemeldete Benutzer Empfänger einer neuen Chat-Nachricht ist und löst bei Bedarf eine Push-Benachrichtigung aus.
- **Eingabe:** `message` (Message)
- **Ausgabe:** `Promise<void>`

### `setBrowserNotification`
- **Zweck:** Fordert Berechtigungen an und sendet eine Browser Desktop-Notification.
- **Eingabe:** `title` (string), `description` (string)
- **Ausgabe:** `Promise<void>`

---

## 5. DatabaseMessages (`db-messages.ts`)
Verwaltet das Senden, Empfangen, Bearbeiten von Nachrichten sowie Emoji-Reaktionen.

### `getMessages`
- **Zweck:** Lädt Nachrichten für Chat, Channel oder Thread sortiert nach Erstellungsdatum.
- **Eingabe:** `msgType` ('chat' | 'channel' | 'thread'), `id` (string)
- **Ausgabe:** `Promise<void>` (Aktualisiert das jeweilige Signal `_chat_messages`, `_channel_messages` oder `_thread_messages`)

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

---

## 6. DatabaseProfiles (`db-profiles.ts`)
Verwaltet Benutzerprofile und synchonisierte Status-Updates.

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

---

## 7. DatabaseThreads (`db-threads.ts`)
Verwaltet Antwort-Stränge (Threads) zu Ursprungs-Nachrichten.

### `getThreadId`
- **Zweck:** Ermittelt die Thread-ID zu einer Ursprungs-Nachricht. Erstellt bei Bedarf einen neuen Thread-Eintrag und verknüpft die Ursprungsnachricht.
- **Eingabe:** `msgId` (string - ID der Ursprungsnachricht)
- **Ausgabe:** `Promise<string>` (Gibt die `thread_id` zurück)

---

## Error-Handling Strategie
1. **Low-Level Supabase Fehler (Sub-Services):**
   Wenn eine Abfrage an Supabase scheitert (z. B. RLS-Verletzung, Constraint-Fehler), wird der Fehler in den Sub-Services abgefangen und in ein einheitliches Fehlerformat übersetzt:
   ```ts
   throw new Error(`[ DB_CODE:${error['code']} ] MSG: ${error['message']}`);
   ```
2. **Haupt-Service Fassade (`db.ts`):**
   In der Fassade werden alle Aufrufe durch die Hilfsmethode `safeCall` umschlossen. Im Fehlerfall wird die Fehlermeldung protokolliert und ein sicherer Fallback-Wert (z. B. `false`, `null`, `[]` oder `undefined`) zurückgegeben, um Abstürze der Anwendung zu vermeiden.

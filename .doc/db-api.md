# Datenbank API Dokumentation

Dieses Dokument beschreibt alle Eingaben und Ausgaben (Responses) der Datenbank-Services in `DA-Bubble`. Es richtet sich an Entwickler, die verstehen möchten, wie mit der Supabase-Datenbank kommuniziert wird.

Alle Services befinden sich im Verzeichnis `src/app/shared/services/db/`.

## 1. DatabaseAuth (`db-auth.ts`)
Verwaltet die Authentifizierung der Benutzer und deren Online-Status.

### `signUpNewUser`
- **Zweck:** Registriert einen neuen Benutzer.
- **Eingabe:** `user_email` (string), `user_password` (string), `user_name` (string), `user_avatar` (string)
- **Ausgabe:** `Promise<boolean>` (Gibt ein false zurück, wenn ein Duplikat vorliegt ansonsten true.)

### `signInWithEmail`
- **Zweck:** Loggt einen bestehenden Benutzer ein.
- **Eingabe:** `user_email` (string), `user_password` (string)
- **Ausgabe:** `Promise<void>`

### `signInWithGoogle`
- **Zweck:** Loggt einen bestehenden oder neuen Benutzer mit seinen Google Account an.
- **Eingabe:** Keine.
- **Ausgabe:** `Promise<void>`

### `signOut`
- **Zweck:** Loggt den aktuellen Benutzer aus und setzt seinen Status auf `offline`.
- **Eingabe:** Keine.
- **Ausgabe:** `Promise<void>`

### `resetPasswordForEmail`
- **Zweck:** Sendet eine E-Mail zum Zurücksetzen des Passworts.
- **Eingabe:** `email` (string)
- **Ausgabe:** `Promise<void>`

## 2. DatabaseChannels (`db-channels.ts`)
Verwaltet Kanäle (Channels) und deren Mitglieder. Hält über Angular Signals den Zustand synchron (Realtime).

### `getChannelIds`
- **Zweck:** Lädt alle Channel-IDs und Namen, in denen der Benutzer Mitglied ist.
- **Eingabe:** `userId` (string)
- **Ausgabe:** `Promise<void>` (Aktualisiert das Signal `_channels`)

### `getChannelData`
- **Zweck:** Lädt alle relevanten Daten eines spezifischen Kanals inkl. Mitgliedern.
- **Eingabe:** `channelId` (string)
- **Ausgabe:** `Promise<void>` (Aktualisiert das Signal `_channel`)

### `createNewChannel`
- **Zweck:** Erstellt einen neuen Kanal und fügt den Ersteller als Admin hinzu.
- **Eingabe:** `userId` (string), `name` (string), `description` (string)
- **Ausgabe:** `Promise<boolean>` (Gibt ein false zurück wenn ein Duplikat vorliegt ansonsten true.)

### `createNewMember` / `removeMember`
- **Zweck:** Fügt einen Benutzer zu einem Kanal hinzu oder entfernt ihn.
- **Eingabe (Create):** `channelId` (string), `userId` (string), `role` ('admin' | 'member')
- **Eingabe (Remove):** `channelId` (string), `userId` (string)
- **Ausgabe:** `Promise<void>`

## 3. DatabaseChats (`db-chats.ts`)
Verwaltet direkte 1-zu-1 Chats.

### `getChatId`
- **Zweck:** Prüft, ob bereits ein Chat zwischen zwei Benutzern existiert. Wenn nicht, wird ein neuer Chat erstellt.
- **Eingabe:** `currentUserId` (string), `otherUserId` (string)
- **Ausgabe:** `Promise<string>` (Gibt die ID des bestehenden oder neuen Chats zurück)

## 4. DatabaseMessages (`db-messages.ts`)
Verwaltet das Senden, Empfangen, Bearbeiten von Nachrichten sowie Reaktionen. Es wird zwischen Chat-, Channel- und Thread-Nachrichten unterschieden.

### `getMessages`
- **Zweck:** Lädt die Nachrichten für einen bestimmten Chat, Channel oder Thread.
- **Eingabe:** `msgType` ('chat' | 'channel' | 'thread'), `id` (string)
- **Ausgabe:** `Promise<void>` (Aktualisiert die jeweiligen Signals `_chat_messages`, `_channel_messages` oder `_thread_messages`)

### `createNewMessage`
- **Zweck:** Erstellt eine neue Nachricht in der Datenbank.
- **Eingabe:** `msgType` (MsgType), `threadChannelId` (string | null), `id` (string), `senderId` (string), `content` (string)
- **Ausgabe:** `Promise<void>`

### `updateMessage`
- **Zweck:** Aktualisiert den Inhalt (Text) einer bestehenden Nachricht.
- **Eingabe:** `messageId` (string), `newContent` (string)
- **Ausgabe:** `Promise<void>`

### `toggleReaction`
- **Zweck:** Fügt eine Emoji-Reaktion hinzu oder entfernt sie, falls sie bereits existiert.
- **Eingabe:** `messageId` (string), `userId` (string), `emoji` (string)
- **Ausgabe:** `Promise<ReactionResult>` (Gibt ein Objekt `{ action: 'added' | 'removed' }` zurück)

## 5. DatabaseProfiles (`db-profiles.ts`)
Verwaltet Benutzerprofile und hält sie über Signals synchron.

### `getProfiles`
- **Zweck:** Lädt alle Benutzerprofile.
- **Eingabe:** Keine.
- **Ausgabe:** `Promise<void>` (Aktualisiert das Signal `_profiles`)

### `getProfile`
- **Zweck:** Lädt die Profildaten eines spezifischen Benutzers.
- **Eingabe:** `profileId` (string)
- **Ausgabe:** `Promise<Profile | null>` (Gibt das Profil-Objekt zurück oder null)

### `updateProfileName`
- **Zweck:** Ändert den Namen eines Benutzers.
- **Eingabe:** `profileId` (string), `value` (string)
- **Ausgabe:** `Promise<void>`

### `updateProfileAvatar`
- **Zweck:** Ändert den Avatar eines Benutzers.
- **Eingabe:** `profileId` (string), `value` (string)
- **Ausgabe:** `Promise<void>`

## 6. DatabaseThreads (`db-threads.ts`)
Verwaltet Thread-Diskussionen (Antwortstränge) zu spezifischen Nachrichten.

### `getThreadId`
- **Zweck:** Prüft, ob zu einer Ursprungs-Nachricht bereits ein Thread existiert. Wenn nicht, wird einer erstellt und die Ursprungs-Nachricht aktualisiert.
- **Eingabe:** `msgId` (string - ID der Ursprungsnachricht)
- **Ausgabe:** `Promise<string>` (Gibt die `thread_id` zurück)

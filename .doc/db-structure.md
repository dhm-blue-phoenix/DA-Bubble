# Datenbank Struktur (DA-Bubble)

Die DA-Bubble Datenbank ist in Supabase (PostgreSQL) gehostet. Dieses Dokument beschreibt die Tabellenstruktur und die Beziehungen zwischen den Entitäten.

## Tabellen-Übersicht

### 1. `profiles`
Speichert Benutzerdaten (automatisch verknüpft mit Supabase Auth).
- `id` (uuid) - Primärschlüssel (verweist auf auth.users)
- `name` (text) - Der Anzeigename des Benutzers
- `email` (text) - E-Mail Adresse
- `avatar_url` (text) / `avatar` (text) - Pfad/URL zum Profilbild
- `status` (text) - Online-Status ('online', 'offline', 'away')
- `created_at` (timestamp) - Erstellungsdatum

### 2. `channels`
Speichert Informationen über öffentliche oder private Kanäle.
- `id` (uuid) - Primärschlüssel
- `name` (text) - Name des Kanals (muss einzigartig sein)
- `description` (text) - Kanalbeschreibung
- `created_by` (uuid) - Foreign Key auf `profiles.id` (Der Ersteller)
- `created_at` (timestamp)
- `edited_at` (timestamp)

### 3. `channel_members`
Mapping-Tabelle für Kanal-Mitgliedschaften (M:N Beziehung).
- `channel_id` (uuid) - Foreign Key auf `channels.id`
- `user_id` (uuid) - Foreign Key auf `profiles.id`
- `role` (text) - z.B. 'admin' oder 'member'
- *Primärschlüssel ist meist (channel_id, user_id)*

### 4. `chats`
Speichert 1-zu-1 Unterhaltungen.
- `id` (uuid) - Primärschlüssel
- `created_at` (timestamp)

### 5. `chat_members`
Mapping-Tabelle für Chat-Teilnehmer.
- `chat_id` (uuid) - Foreign Key auf `chats.id`
- `user_id` (uuid) - Foreign Key auf `profiles.id`
- *Primärschlüssel ist (chat_id, user_id)*

### 6. `threads`
Speichert Diskussionsfäden, die von einer Nachricht abzweigen.
- `id` (uuid) - Primärschlüssel
- `root_message_id` (uuid) - Foreign Key auf `messages.id` (Die Nachricht, unter der der Thread gestartet wurde)
- `created_at` (timestamp)

### 7. `messages`
Speichert alle Arten von Nachrichten (Chat, Channel, Thread).
- `id` (uuid) - Primärschlüssel
- `chat_id` (uuid, nullable) - Foreign Key auf `chats.id` (wenn Chat-Nachricht)
- `channel_id` (uuid, nullable) - Foreign Key auf `channels.id` (wenn Channel-Nachricht)
- `thread_id` (uuid, nullable) - Foreign Key auf `threads.id` (wenn Thread-Antwort)
- `sender_id` (uuid) - Foreign Key auf `profiles.id` (Wer hat die Nachricht geschrieben)
- `content` (text) - Der eigentliche Nachrichtentext
- `created_at` (timestamp)
- `edited_at` (timestamp, nullable)

*Hinweis:* Jede Nachricht hat exakt eine übergeordnete Referenz: Entweder `chat_id`, `channel_id` oder `thread_id`. 

### 8. `reactions`
Speichert Emoji-Reaktionen auf Nachrichten.
- `message_id` (uuid) - Foreign Key auf `messages.id`
- `user_id` (uuid) - Foreign Key auf `profiles.id`
- `emoji` (text) - Das gewählte Emoji (z.B. '👍')
- `created_at` (timestamp)
- *Primärschlüssel ist (message_id, user_id, emoji)*

## Realtime subscriptions
Die Tabellen `messages`, `reactions`, `channels`, `channel_members` und `profiles` haben in Supabase Realtime aktiviert. Die Angular-App abonniert Änderungen auf diese Tabellen, um die Oberfläche automatisch in Echtzeit zu aktualisieren (WebSockets).

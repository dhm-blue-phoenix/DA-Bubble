# DA-Bubble

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](https://angular.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

A real-time team chat application with channels, direct messages and threads.

---

## 💬 About The Project

DA-Bubble is a Slack-style communication app built as a group project at the Developer Akademie. Users sign up, pick an avatar and join a shared workspace where they can talk in channels, write private direct messages and discuss individual messages in threads. Everything is synchronized live through Supabase Realtime, so new messages, reactions and status changes show up without reloading the page.

---

## ✨ Features

* 🔐 **Authentication**: Sign up, log in, guest login, password reset and avatar selection
* 📢 **Channels**: Create, edit and browse channels, add members and view the member list
* ✉️ **Direct Messages**: One-to-one chats, including a chat with yourself
* 🧵 **Threads**: Reply to any message in a separate thread view
* 😀 **Emoji Reactions**: React to messages with an emoji picker
* 🏷️ **Mentions**: Mention people with `@` and channels with `#` while typing
* 🔍 **Search**: Find people, channels and messages from the header and jump straight to the result
* 👤 **User Profiles**: Profile dialogs with avatar and online / away / offline status
* ⚡ **Real-time Updates**: Live synchronization via Supabase Realtime
* 📄 **Legal Pages**: Imprint and privacy policy

---

## 🛠️ Built With

### Frontend

* [Angular](https://angular.dev/) 21 - standalone components, signals, zoneless change detection, SSR
* [TypeScript](https://www.typescriptlang.org/) - language
* [Tailwind CSS](https://tailwindcss.com/) 4 - styling
* [emoji-picker-element](https://github.com/nolanlawson/emoji-picker-element) - emoji picker

### Backend & Services

* [Supabase](https://supabase.com/) - authentication, PostgreSQL database and Realtime

### Tooling

* [Vitest](https://vitest.dev/) - unit tests for the database services
* [Express](https://expressjs.com/) - server for the SSR build

---

## 📁 Project Structure

```
DA-Bubble/
│
├── .doc/                          # Database structure and API documentation
├── public/                        # Static assets (avatars, icons, ...)
├── src/
│   ├── app/
│   │   └── shared/
│   │       ├── components/
│   │       │   ├── feature/       # Container components that hold state
│   │       │   ├── ui/            # Presentational components and dialogs
│   │       │   └── legal/         # Imprint and privacy policy
│   │       ├── services/          # Supabase services (db/), mentions, sign-in, ...
│   │       └── interfaces/        # TypeScript models
│   ├── environment/               # Environment configuration (gitignored)
│   └── server.ts                  # SSR server
├── angular.json                   # Angular CLI configuration
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

---

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites

* **Git**
  ```
  git --version
  ```
* **Node.js and npm** in a version supported by Angular 21 (see the [compatibility table](https://angular.dev/reference/versions))
  ```
  node --version
  npm --version
  ```
* **A Supabase project** with the tables, row-level security policies and Realtime subscriptions the app uses. See [`.doc/db-structure.md`](.doc/db-structure.md) and [`.doc/db-api.md`](.doc/db-api.md).

### Installation

1. **Clone the repository**
   ```
   git clone <repository-url> DA-Bubble
   cd DA-Bubble
   ```
2. **Install dependencies**
   ```
   npm install
   ```
3. **Set up the environment file** (see [Environment Variables](#-environment-variables))
4. **Start the development server**
   ```
   npm start
   ```
5. **Open your browser** at <http://localhost:4200/>

---

## 🔐 Environment Variables

The local environment file contains your Supabase configuration and is not committed to Git.

### Setup Instructions

1. **Create the environment file** from the template

   macOS / Linux:
   ```
   cp src/environment/environment.ts.example src/environment/environment.ts
   ```
   Windows PowerShell:
   ```
   Copy-Item src\environment\environment.ts.example src\environment\environment.ts
   ```
2. **Fill in the values** in `src/environment/environment.ts`

| Variable | Required | Description |
|----------|----------|-------------|
| `supabaseUrl` | yes | Supabase project URL, e.g. `https://<project-ref>.supabase.co` |
| `supabaseKey` | yes | Supabase publishable (anon) key |
| `guest_email`, `guest_password` | no | Credentials of the account used for the guest login |
| `debug_user*` | no | Optional test users for development |
| `debug_logs` | no | Enables debug logging |

3. **How to get these values**
   * **Supabase**: Create a project, open *Settings > API* and copy the project URL and the publishable key.

> Never put a `service_role` key or other secrets in this file. Client configuration is visible in the browser.

---

## 💡 Usage

1. **Sign up or log in**, or use the guest login
2. **Choose an avatar** after signing up
3. **Open a channel or start a direct message** from the workspace sidebar
4. **Write messages** and mention people with `@` or channels with `#`
5. **React with emojis** or open a **thread** on any message
6. **Search** for people, channels and messages in the header

---

## 🧪 Tests & Build

```
npm test                  # run unit tests (Vitest)
npm run build             # production build with SSR
npm run serve:ssr:da_bubble   # start the generated SSR server
```

The database service tests mock Supabase, so no live project is needed. To build for a subpath, use `npm run build:da_server` and adjust the base href in `package.json` to your hosting URL.

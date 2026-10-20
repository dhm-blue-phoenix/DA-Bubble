# DA-Bubble

DA-Bubble is a real-time chat application built with Angular and Supabase. It supports direct messages, channels, threads, emoji reactions, and user profiles with online status. Messages and other updates are synchronized through Supabase Realtime.

## Technology

- Angular 21 with TypeScript
- Supabase for authentication, PostgreSQL, and Realtime
- Tailwind CSS 4
- Vitest for unit tests

## Prerequisites

- Git (installation guides for [Windows](https://git-scm.com/install/windows), [macOS](https://git-scm.com/install/mac), and [Linux](https://git-scm.com/install/linux))
- Node.js and npm in a version supported by Angular 21. Installers and instructions for [Windows](https://nodejs.org/en/download), [macOS](https://nodejs.org/en/download), and [Linux](https://nodejs.org/en/download) are available on the official Node.js website. Check the [Angular compatibility table](https://angular.dev/reference/versions) for supported versions.
- Access to a Supabase project

## Step-by-step setup

Run the commands from your project directory. On Windows, use PowerShell or Windows Terminal; on macOS, use Terminal; on Linux, use your preferred terminal. Git and npm commands are the same on all three operating systems. Replace `<repository-url>` with the repository's clone URL.

1. Clone the repository and enter the project directory:

   ```sh
   git clone <repository-url> DA-Bubble
   cd DA-Bubble
   ```

   If you already have a local copy, open a terminal in the project directory or use `cd` to navigate there.

2. Install dependencies:

   ```sh
   npm install
   ```

3. Create the local Supabase configuration file. The copy command differs by operating system:

   **Windows PowerShell:**
   ```powershell
   Copy-Item src\environment\environment.ts.example src\environment\environment.ts
   ```

   **Windows Command Prompt (cmd.exe):**
   ```bat
   copy src\environment\environment.ts.example src\environment\environment.ts
   ```

   **macOS or Linux:**
   ```sh
   cp src/environment/environment.ts.example src/environment/environment.ts
   ```

4. Open `src/environment/environment.ts` in an editor. Replace the empty values with your Supabase project URL and publishable key:

   ```ts
   supabaseUrl: 'https://<project-ref>.supabase.co',
   supabaseKey: '<publishable-key>',
   ```

   The other fields can initially remain empty for local development. The local file `src/environment/environment.ts` is not tracked by Git. Do not put a `service_role` key or other secrets in it: client configuration is visible in the browser. Optional guest-login and debug-user credentials can also be configured in this file.

5. Start the development server:

   ```sh
   npm start
   ```

6. Open <http://localhost:4200/> in your browser. The server watches source files and reloads the application when they change.

   To access the server from other devices on your local network, you can optionally run `npm run start:allowed_hosts`. This binds the development server to all network interfaces and allows all host names. Use it only on trusted networks, and never as a production server.

The Supabase project must also provide the tables, row-level security (RLS) policies, and Realtime subscriptions used by the application. See [`.doc/db-structure.md`](.doc/db-structure.md) for an overview of the tables and [`.doc/db-api.md`](.doc/db-api.md) for details about the database services.

## Build and deployment

Create a production build for deployment at the domain root:

```bash
npm run build
```

The output is written to `dist/da_bubble/`. The Angular configuration creates a Node.js server build and prerenders the configured routes. After building, start the generated SSR server locally with:

```bash
npm run serve:ssr:da_bubble
```

By default, the application is available at <http://localhost:4000/>. The server uses the `PORT` environment variable if it is set.

To build for deployment under a subpath, use:

```bash
npm run build:da_server
```

This sets the base href to `/angular-projects/da-bubble/`. Change the path to match the actual hosting URL. SSR deployment requires a Node.js hosting environment that runs the generated server; prerendered pages and browser assets are served by the server build.

## Tests

Run unit tests with Vitest:

```bash
npm test
```

The database service tests mock Supabase queries and Realtime events, so they do not require a connection to a live Supabase project. To run a specific test file:

```bash
npx ng test --include="src/app/shared/services/db/db-messages.spec.ts"
```

## Angular CLI

Generate Angular components and other artifacts with the CLI:

```bash
npx ng generate component component-name
npx ng generate --help
```

For more information, see the [Angular CLI documentation](https://angular.dev/tools/cli).

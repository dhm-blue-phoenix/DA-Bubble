# DaBubble

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.12.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

### Database Testing & Debugging

The application uses Vitest for testing and mocks the Supabase database interactions using custom mock chains. 

If you want to monitor the data flow and verify the queries being made to the database during tests, you can enable the debug flow.

1. Open the specific test file (e.g., `src/app/shared/services/db/db-messages.spec.ts`).
2. Locate the constant `DEBUG_TEST_FLOW` at the top of the file:
   ```typescript
   const DEBUG_TEST_FLOW = false;
   ```
3. Change it to `true` to enable verbose logging:
   ```typescript
   const DEBUG_TEST_FLOW = true;
   ```
4. Run the tests. You will see detailed logs of all mocked `select`, `insert`, `update`, and `delete` calls in your terminal, as well as the simulated Realtime events.

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

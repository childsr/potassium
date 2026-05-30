# Potassium Project Overview

Potassium is a TypeScript-based engine for tracking state and binding events to state changes and side effects. It provides a structured way to build stateful applications by decoupling event sources from state mutations and side effects.

## Core Technologies
- **Language:** TypeScript
- **Build Tool:** [Vite](https://vite.dev/)
- **State Management:** Custom builder-pattern based app logic in `src/index.ts`.
- **Event Handling:** Depends on `@bananaseed/event_stream` for reactive event streams.

## Project Structure
- `src/index.ts`: Core logic for creating and running Potassium applications.
- `src/util.ts`: Internal utilities for cloning Maps and Sets.
- `test/test1.ts`: A sample REPL application demonstrating how to use Potassium with `readline` and `process.stdin`.

## Building and Running

### Development
- **Watch mode:** `npm run watch` (uses Vite to watch and rebuild)
- **Type checking:** `npm run check` (runs `tsc --noEmit`)

### Production
- **Build:** `npm run build` (uses Vite to generate the `dist` folder)

### Testing
- Run tests with `npm run test`.

## Development Conventions

### Code Style
- Use TypeScript for all source files.
- The project follows a functional/reactive approach using `EventStream`.
- Internal state is managed within the `_App` class, and public interfaces (`Builder`, `App`) are used to interact with it.

### Architecture
- **Builder Pattern:** Use `createApp()` to get a `Builder` instance, configure handlers (`bind`, `onStart`, `onStop`), and then call `start(initialState)`.
- **Triggers:** Named events that can be manually triggered within the app.
- **Event Streams:** External reactive streams that can be bound to the app state.
- **Context:** Optional shared context (e.g., IO, configuration) accessible by all handlers.

### Testing Practices
- Current tests are functional/integration tests located in the `test/` directory.
- `test/test1.ts` serves as both a test and a usage example.

# Potassium 🍌

A lightweight, robust, and highly predictable TypeScript-based engine for tracking state and binding reactive event streams to state changes. 

Potassium helps in building stateful, event-driven applications by decoupling **event sources** from **state mutations** and **side effects**. It relies on reactive streams provided by [@bananaseed/event_stream](https://www.npmjs.com/package/@bananaseed/event_stream) to coordinate interactions cleanly.

---

## Features

- **Builder Pattern API**: Declaratively bind event sources to state mutations and side effects before starting the application runtime.
- **Decoupled Event Handling**: Use both external event streams ([EventStream](https://www.npmjs.com/package/@bananaseed/event_stream)) and internal triggers as event sources.
- **Context Injection**: Pass a shared, read-only context (e.g., config, database connections, I/O interfaces) to all event handlers.
- **Type-Safe**: Built with TypeScript and designed for complete static type safety of state, context, and triggers.
- **Modern Bundling**: Compiled into standard ESM (`.mjs`) and CommonJS (`.js`) formats using Vite, fully type-checked with TypeScript 6.0.

---

## Core Concepts

Potassium applications are built around three main type parameters:

1. **State**: The structure of your application's mutable state.
2. **Context**: A read-only environment or dependency container (e.g., logger, API services) accessible by all handlers.
3. **TriggerMap**: A record type of internally-triggerable named events mapped to their corresponding payload types.

---

## Installation

```bash
npm install @bananaseed/potassium
```

---

## Quick Start Example

Here is a simple example showing how to build a stateful app using Potassium that handles keystrokes and maintains a history of input.

```typescript
import { createApp, EventStream } from "@bananaseed/potassium";

// 1. Define your Types
type State = {
  text: string;
};

type Context = {
  logger: Console;
};

type Triggers = {
  reset: void;
};

// 2. Setup your Event Stream (e.g., listening to mock inputs)
const inputEvents = new EventStream<string>(listener => {
  const timer = setInterval(() => listener("a"), 1000);
  return {
    cancel() {
      clearInterval(timer);
    }
  };
});

// 3. Instantiate the App Builder
const ctx: Context = { logger: console };
const builder = createApp<State, Context, Triggers>(ctx);

// 4. Bind Handlers and Hooks
builder.onStart(k => {
  k.context.logger.log("Application started!");
});

// Bind an external EventStream
builder.bind(inputEvents, (k, char) => {
  k.state.text += char;
  k.context.logger.log(`Current Text: ${k.state.text}`);
  
  if (k.state.text.length >= 5) {
    k.trigger("reset");
  }
});

// Bind an internal named trigger
builder.bind("reset", k => {
  k.context.logger.log("Resetting state...");
  k.state.text = "";
});

builder.onStop(k => {
  k.context.logger.log("Application stopped.");
});

// 5. Start the Application
const finalState = await builder.start({ text: "" });
```

---

## API Reference

### `createApp`

Initializes a new application builder.

```typescript
function createApp<State, TriggerMap = {}>(): Builder<State, void, TriggerMap>;
function createApp<State, Context, TriggerMap = {}>(context: Context): Builder<State, Context, TriggerMap>;
```

### `Builder` Interface

Use the `Builder` to configure your application prior to starting.

#### `bind`
Binds an external event stream or an internal trigger to a handler.
```typescript
bind<T>(eventStream: EventStream<T>, handler: Handler<App, T>): symbol;
bind<K extends keyof TriggerMap>(triggerId: K, handler: Handler<App, TriggerMap[K]>): symbol;
```
- **Returns**: A unique `symbol` ID that can be passed to `unbind` to remove the handler at runtime.

#### `onStart`
Registers a hook that is executed immediately when the app starts.
```typescript
onStart(handler: VoidHandler<App>): void;
```

#### `onStop`
Registers a hook that runs when the application is stopped.
```typescript
onStop(handler: VoidHandler<App>): symbol;
```

#### `start`
Starts the runtime loop with the provided initial state. Returns a promise that resolves with the final state when the application stops.
```typescript
start(initialState: State): Promise<State>;
```

---

### `App` Interface

Passed as the first argument to all handlers, representing the running application instance.

#### `state`
The current mutable state of your application. Directly modify properties here to mutate state.
```typescript
state: State;
```

#### `context`
The read-only context configuration passed into `createApp`.
```typescript
readonly context: Context;
```

#### `trigger`
Triggers a named event internally, firing all matching trigger handlers configured on the builder.
```typescript
trigger<K extends keyof TriggerMap>(triggerId: K, payload: TriggerMap[K]): void;
```

#### `unbind`
Removes a registered handler or stream listener dynamically at runtime.
```typescript
unbind(id: symbol): boolean; // Unbinds event stream or onStop handler
unbind<K extends keyof TriggerMap>(triggerId: K, id: symbol): boolean; // Unbinds trigger handler
```

#### `stop`
Stops the application, triggers all `onStop` handlers, cancels all active `EventStream` listeners, and resolves the promise returned by `start()`.
```typescript
stop(): void;
```

---

## Development & Building

The project uses [Vite](https://vite.dev/) in Library Mode and targets modern ESM and CommonJS runtimes.

### Script Commands

- **Build Output**: `npm run build`
  Compiles the project and outputs built files to `dist/`:
  - `dist/main.js` (CommonJS build)
  - `dist/main.mjs` (ES Module build)
  - `dist/main.d.ts` (Bundled type declarations)
- **Watch Mode**: `npm run watch`
  Runs Vite in watch mode to automatically rebuild on file changes.
- **Type Checking**: `npm run check`
  Performs full type-checking using `tsc --noEmit` over all source and test files.
- **Run Integration Tests**: `npm test`
  Launches the interactive CLI REPL test application using `ts-node`.

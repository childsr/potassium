import { createApp } from "../src"
import { EventStream } from "@bananaseed/event_stream"

type State = {
  lastInput: string,
  history: string[]
}

type Triggers = {
  log: string,
  alert: string
}

const keyStream = EventStream.fromEventTarget<KeyboardEvent>(window, "keydown")

function main() {
  const builder = createApp<State,Triggers>()

  // Handle Triggers
  builder.bind("log", (app, message) => {
    console.log(`[LOG]: ${message}`)
  })

  builder.bind("alert", (app, message) => {
    console.warn(`[ALERT]: ${message}`)
    app.state.history.push(`Alert: ${message}`)
  })

  // Bind keyboard input
  builder.bind(keyStream, (app, event) => {
    app.state.lastInput = event.key
    app.trigger("log", `Key pressed: ${event.key}`)

    if (event.key === "Enter") {
      app.trigger("alert", "Enter key was pressed!")
    }
    
    if (event.key === "Escape") {
      app.stop()
    }
  })

  builder.onStart(() => {
    console.log("Triggers Example Started.")
    console.log("Press any key to log, Enter for alert, Escape to stop.")
  })

  builder.onStop(app => {
    console.log("Final state history:", app.state.history)
  })

  builder.start({ lastInput: "", history: [] })
}

main()

import { createApp } from "../src"
import { EventStream } from "@bananaseed/event_stream"

type State = { 
  seconds: number,
  running: boolean 
}

// Every 1 second, emit a tick
const timerStream = EventStream.fromInterval(1000)
// Pressing 's' toggles the timer
const keyStream = EventStream.fromEventTarget<KeyboardEvent>(window, "keydown")

function main() {
  const app = createApp<State>()

  app.onStart(() => {
    console.log("Stopwatch Started.")
    console.log("Press 's' to start/stop the timer.")
  })

  // Toggle running state on 's' key
  app.bind(keyStream, (app, event) => {
    if (event.key.toLowerCase() === 's') {
      app.state.running = !app.state.running
      console.log(app.state.running ? "Timer Running" : "Timer Paused")
    }
  })

  // Increment seconds if running
  app.bind(timerStream, (app) => {
    if (app.state.running) {
      app.state.seconds++
      const mins = Math.floor(app.state.seconds / 60)
      const secs = app.state.seconds % 60
      console.log(`Time: ${mins}:${secs.toString().padStart(2, '0')}`)
    }
  })

  app.start({ seconds: 0, running: false })
}

main()

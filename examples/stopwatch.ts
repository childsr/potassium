import { createApp, EventStream } from "../src"

type State = { 
  seconds: number,
  running: boolean 
}

// Every 1 second, emit a tick
const timerStream = EventStream.fromInterval(1000)
// Pressing 's' toggles the timer
const keyStream = EventStream.fromEventTarget<KeyboardEvent>(window, "keydown")
const sKey = keyStream.filter(e => e.key.toLowerCase() === "s")

function main() {
  const builder = createApp<State>()

  builder.onStart(() => {
    console.log("Stopwatch Started.")
    console.log("Press 's' to start/stop the timer.")
  })

  // Toggle running state on 's' key
  builder.bind(sKey, k => {
    k.state.running = !k.state.running
    console.log(k.state.running ? "Timer Running" : "Timer Paused")
  })

  // Increment seconds if running
  builder.bind(timerStream, k => {
    if (k.state.running) {
      k.state.seconds++
      const mins = Math.floor(k.state.seconds / 60)
      const secs = k.state.seconds % 60
      console.log(`Time: ${mins}:${secs.toString().padStart(2, "0")}`)
    }
  })

  builder.start({ seconds: 0, running: false })
}

main()

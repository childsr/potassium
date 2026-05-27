import { createApp } from "../src"
import { EventStream } from "@bananaseed/event_stream"

type State = { count: number }

const clickStream = EventStream.fromEventTarget(window, "click")

function main() {
  const app = createApp<State>()

  app.onStart(() => console.log("Counter App Started. Click anywhere to increment!"))

  app.bind(clickStream, (app) => {
    app.state.count++
    console.log(`Count: ${app.state.count}`)
  })

  app.start({ count: 0 })
}

main()

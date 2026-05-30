import { createApp, EventStream } from "../src"

type State = { count: number }

const clickStream = EventStream.fromEventTarget(window, "click")

function main() {
  const builder = createApp<State>()

  builder.onStart(() => console.log("Counter App Started. Click anywhere to increment!"))

  builder.bind(clickStream, k => {
    k.state.count++
    console.log(`Count: ${k.state.count}`)
  })

  builder.start({ count: 0 })
}

main()

import { createApp } from "../src"
import { EventStream } from "@bananaseed/event_stream"
import * as readline from "readline"

type Stdout = typeof process.stdout

type State = {
  input: string[]
  cursor: number
}
type Context = {
  console: Console
  stdout: Stdout
  process: NodeJS.Process
}
type Triggers = { error: Error | string }

type Key = {
  sequence: string
  name: string
  ctrl: boolean
  meta: boolean
  shift: boolean
}

readline.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)

const keypress = new EventStream<{ char: string, key: Key }>(listener => {
  const keypressListener = (char: string, key: Key) => listener({ char, key })
  process.stdin.on("keypress",keypressListener)
  return {
    cancel() {
      process.stdin.off("keypress",keypressListener)
    }
  }
})
const charPress = keypress
  .filter(({ char, key }) => 
    typeof char === "string" &&
    !key.ctrl &&
    !key.meta &&
    key.name !== "return"
  )
  .map(({ char }) => char)
const enterPress = keypress.filter(({ key: { name } }) => name === "return")

const ctx: Context = {
  console,
  stdout: process.stdout,
  process
}

function main() {
  const app = createApp<State,Context,Triggers>(ctx)
  const prompt = (ctx: Context, text: string = "") => ctx.stdout.write("> " + text)

  app.bind("error", (app,e) => app.context.console.error(e))
  app.bind(keypress, (app,{ key }) => {
    if (key.ctrl && key.name === "c") app.stop()
    else if (key.ctrl && key.name === "l") {
      app.context.console.clear()
      prompt(app.context,app.state.input.join(""))
    }
  })
  app.bind(charPress, (app,char) => {
    app.state.input.push(char)
    app.context.stdout.write(char)
  })
  app.bind(enterPress, app => {
    const line = app.state.input.join("")
    app.state.input = []
    app.context.stdout.write("\n")
    try {
      const result = eval(line)
      app.context.console.log(result)
    }
    catch (err) {
      app.trigger("error",err as Error)
    }
    prompt(app.context)
  })
  app.onStart(({ context }) => prompt(context))
  app.onStop(app => {
    console.log("")
    setTimeout(() => app.context.process.exit(), 250)
  })
  return app.start({ input: [], cursor: 0 })
}

main()
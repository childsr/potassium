import { createApp } from "../src"
import { EventStream } from "@bananaseed/event_stream"

type State = {
  input: string[]
  cursor: number
}

type Terminal = {
  write: (text: string) => void
  clear: () => void
}

type Context = {
  console: Console
  terminal: Terminal
}

type Triggers = { error: Error | string }

type Key = {
  sequence: string
  name: string
  ctrl: boolean
  meta: boolean
  shift: boolean
}

function getTerminal(): Terminal {
  let el = document.getElementById("terminal")
  if (!el) {
    el = document.createElement("pre")
    el.id = "terminal"
    el.style.whiteSpace = "pre-wrap"
    el.style.wordBreak = "break-all"
    el.style.fontFamily = "monospace"
    el.style.padding = "10px"
    el.style.backgroundColor = "#1e1e1e"
    el.style.color = "#d4d4d4"
    el.style.margin = "0"
    el.style.height = "100vh"
    el.style.overflowY = "auto"
    document.body.style.margin = "0"
    document.body.appendChild(el)
  }
  const terminalEl = el
  return {
    write: (text) => {
      terminalEl.textContent += text
      terminalEl.scrollTop = terminalEl.scrollHeight
    },
    clear: () => {
      terminalEl.textContent = ""
    }
  }
}

const keypress = EventStream.fromEventTarget<KeyboardEvent>(window, "keydown").map(e => {
  const key: Key = {
    name: e.key.toLowerCase(),
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    shift: e.shiftKey,
    sequence: e.key
  }
  // Normalize some key names to match original Node.js readline behavior
  if (key.name === "enter") key.name = "return"
  
  return { char: e.key.length === 1 ? e.key : "", key, event: e }
})

// We might want to prevent default for some keys to avoid browser shortcuts interfering
keypress.listen(({ key, event }) => {
  if (key.ctrl && (key.name === "c" || key.name === "l")) {
    event.preventDefault()
  }
  if (key.name === "return") {
    event.preventDefault()
  }
})

const charPress = keypress
  .filter(({ char, key }) => 
    char.length === 1 &&
    !key.ctrl &&
    !key.meta &&
    key.name !== "return"
  )
  .map(({ char }) => char)

const enterPress = keypress.filter(({ key: { name } }) => name === "return")

const ctx: Context = {
  console,
  terminal: getTerminal()
}

function main() {
  const app = createApp<State,Context,Triggers>(ctx)
  const prompt = (ctx: Context, text: string = "") => ctx.terminal.write("> " + text)

  app.bind("error", (app,e) => app.context.console.error(e))
  app.bind(keypress, (app,{ key }) => {
    if (key.ctrl && key.name === "c") app.stop()
    else if (key.ctrl && key.name === "l") {
      app.context.terminal.clear()
      prompt(app.context,app.state.input.join(""))
    }
  })
  app.bind(charPress, (app,char) => {
    app.state.input.push(char)
    app.context.terminal.write(char)
  })
  app.bind(enterPress, app => {
    const line = app.state.input.join("")
    app.state.input = []
    app.context.terminal.write("\n")
    try {
      const result = eval(line)
      app.context.terminal.write(String(result) + "\n")
    }
    catch (err) {
      app.trigger("error",err as Error)
    }
    prompt(app.context)
  })
  app.onStart(({ context }) => prompt(context))
  app.onStop(() => {
    ctx.terminal.write("\nApp stopped.\n")
  })
  return app.start({ input: [], cursor: 0 })
}

main()

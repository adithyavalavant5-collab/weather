// Weather Simulator WebSocket Mini-Service with auto-restart wrapper
// Wraps the actual server in a process that survives crashes.

import { spawn } from 'node:child_process'
import { writeFileSync, appendFileSync } from 'node:fs'

const LOG_FILE = '/tmp/weather-sim.log'
const ENTRY = '/home/z/my-project/mini-services/weather-simulator/index.ts'

function log(msg: string) {
  const line = `[wrapper ${new Date().toISOString()}] ${msg}`
  console.log(line)
  appendFileSync(LOG_FILE, line + '\n')
}

let child: any = null
let restartCount = 0
const MAX_RESTARTS = 50

function startChild() {
  log(`Starting weather-simulator (attempt ${restartCount + 1}/${MAX_RESTARTS})`)
  child = spawn('bun', ['run', ENTRY], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    env: { ...process.env },
  })

  child.stdout?.on('data', (d: Buffer) => {
    const text = d.toString().trim()
    if (text) appendFileSync(LOG_FILE, text + '\n')
  })
  child.stderr?.on('data', (d: Buffer) => {
    const text = d.toString().trim()
    if (text) appendFileSync(LOG_FILE, `[stderr] ${text}\n`)
  })

  child.on('exit', (code: number, signal: string) => {
    log(`weather-simulator exited (code=${code}, signal=${signal})`)
    if (restartCount < MAX_RESTARTS) {
      restartCount++
      log(`Restarting in 1 second...`)
      setTimeout(startChild, 1000)
    } else {
      log(`Max restarts reached, giving up.`)
    }
  })

  child.on('error', (err: Error) => {
    log(`weather-simulator spawn error: ${err.message}`)
  })
}

// Graceful shutdown
process.on('SIGTERM', () => {
  log('SIGTERM received, killing child')
  if (child) child.kill('SIGTERM')
  process.exit(0)
})
process.on('SIGINT', () => {
  log('SIGINT received, killing child')
  if (child) child.kill('SIGINT')
  process.exit(0)
})

startChild()

// Keep process alive
setInterval(() => {
  if (!child || child.exitCode !== null) {
    log('Child not running, restarting...')
    if (restartCount < MAX_RESTARTS) {
      restartCount++
      startChild()
    }
  }
}, 10000)

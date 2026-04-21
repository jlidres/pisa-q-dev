import 'dotenv/config'
import 'reflect-metadata'
import express from 'express'

import { createNestServer } from './src/create-nest-server'

async function bootstrap() {
  const port = Number(process.env.API_PORT || 3000)
  const expressApp = express()
  const app = await createNestServer(expressApp)

  await app.listen(port)
  console.log(`API listening on http://127.0.0.1:${port}`)
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start Nest API:', error)
  process.exit(1)
})
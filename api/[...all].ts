import 'dotenv/config'
import 'reflect-metadata'
import express from 'express'
import type { Request, Response } from 'express'

import { createNestServer } from '../server/src/create-nest-server'

let cachedHandler: ReturnType<typeof express> | null = null

async function getHandler() {
  if (cachedHandler) {
    return cachedHandler
  }

  const expressApp = express()
  await createNestServer(expressApp)
  cachedHandler = expressApp
  return expressApp
}

export default async function handler(req: Request, res: Response) {
  const app = await getHandler()
  req.url = req.url.replace(/^\/api/, '') || '/'
  return app(req, res)
}
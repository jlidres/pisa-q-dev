import 'dotenv/config'
import 'reflect-metadata'
import express from 'express'
import type { Request, Response } from 'express'

import { createApiServer } from './runtime'

let cachedHandler: ReturnType<typeof express> | null = null

async function getHandler() {
  if (cachedHandler) {
    return cachedHandler
  }

  const expressApp = express()
  await createApiServer(expressApp)
  cachedHandler = expressApp
  return expressApp
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getHandler()
    req.url = req.url.replace(/^\/api/, '') || '/'
    return app(req, res)
  } catch (error) {
    console.error('Vercel API startup failure:', error)
    res.status(500).json({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'Internal server error',
    })
  }
}

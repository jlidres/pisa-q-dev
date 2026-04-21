import 'dotenv/config'
import 'reflect-metadata'
import express from 'express'
import type { Request, Response } from 'express'

let cachedHandler: ReturnType<typeof express> | null = null

async function getHandler() {
  if (cachedHandler) {
    return cachedHandler
  }

  const { createNestServer } = await import('../server/src/create-nest-server')
  const expressApp = express()
  await createNestServer(expressApp)
  cachedHandler = expressApp
  return expressApp
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getHandler()
    req.url = req.url.replace(/^\/api/, '') || '/'
    return app(req, res)
  } catch (error) {
    const payload = serializeError(error)
    console.error('Vercel API startup failure:', payload)
    res.status(500).json(payload)
  }
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      statusCode: 500,
      error: error.name,
      message: error.message,
      stack: error.stack,
      node: process.version,
    }
  }

  return {
    statusCode: 500,
    error: 'UnknownError',
    message: String(error),
    node: process.version,
  }
}
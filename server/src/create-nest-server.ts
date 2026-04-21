import express from 'express'
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import type { Express } from 'express'

import { AppModule } from './app.module'

export async function createNestServer(expressApp: Express) {
  expressApp.use(express.json({ limit: '10mb' }))
  expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }))

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    cors: false,
    bodyParser: false,
  })

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').map((item) => item.trim()) || true,
    credentials: true,
  })

  await app.init()
  return app
}
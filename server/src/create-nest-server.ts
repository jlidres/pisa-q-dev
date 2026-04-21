import express from 'express'
import { HttpException } from '@nestjs/common'
import type { Express } from 'express'

import { AdminAuthService } from './admin-auth.service'
import { DatabaseService } from './database.service'

export async function createNestServer(expressApp: Express) {
  const auth = new AdminAuthService()
  const database = new DatabaseService()

  expressApp.use(express.json({ limit: '10mb' }))
  expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }))

  expressApp.use((_, res, next) => {
    const origin = process.env.CORS_ORIGIN
    res.header('Access-Control-Allow-Origin', origin ? origin : '*')
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
    res.header('Access-Control-Allow-Credentials', 'true')
    next()
  })

  expressApp.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    next()
  })

  expressApp.get('/health', async (_, res) => {
    try {
      res.json(await database.getHealth())
    } catch (error) {
      handleError(error, res)
    }
  })

  expressApp.get('/assessments/published', async (req, res) => {
    try {
      const published = await database.getPublishedAssessment(
        String(req.query.subject ?? ''),
        String(req.query.grade ?? ''),
      )

      res.json({ data: published })
    } catch (error) {
      handleError(error, res)
    }
  })

  expressApp.post('/admin/session', (req, res) => {
    try {
      const body = req.body as { username?: string; password?: string }
      res.json(auth.createSession(body.username ?? '', body.password ?? ''))
    } catch (error) {
      handleError(error, res)
    }
  })

  expressApp.get('/admin/drafts', async (req, res) => {
    try {
      auth.verifyAuthorizationHeader(req.header('authorization'))
      const draft = await database.getLatestDraft(
        String(req.query.subject ?? ''),
        String(req.query.grade ?? ''),
      )

      res.json({ data: draft })
    } catch (error) {
      handleError(error, res)
    }
  })

  expressApp.put('/admin/drafts', async (req, res) => {
    try {
      auth.verifyAuthorizationHeader(req.header('authorization'))
      res.json(await database.saveDraft(req.body))
    } catch (error) {
      handleError(error, res)
    }
  })

  expressApp.post('/admin/publish', async (req, res) => {
    try {
      auth.verifyAuthorizationHeader(req.header('authorization'))
      res.json(await database.publishDraft(req.body))
    } catch (error) {
      handleError(error, res)
    }
  })

  expressApp.post('/attempts', async (req, res) => {
    try {
      res.json(await database.saveAttempt(req.body))
    } catch (error) {
      handleError(error, res)
    }
  })

  expressApp.get('/analytics/overview', async (req, res) => {
    try {
      auth.verifyAuthorizationHeader(req.header('authorization'))
      res.json(
        await database.getAnalytics(
          req.query.subject ? String(req.query.subject) : undefined,
          req.query.grade ? String(req.query.grade) : undefined,
        ),
      )
    } catch (error) {
      handleError(error, res)
    }
  })

  return expressApp
}

function handleError(error: unknown, res: express.Response) {
  if (error instanceof HttpException) {
    res.status(error.getStatus()).json({
      statusCode: error.getStatus(),
      message: error.message,
      error: error.name,
    })
    return
  }

  const message = error instanceof Error ? error.message : 'Internal server error'
  res.status(500).json({
    statusCode: 500,
    message,
    error: 'InternalServerError',
  })
}
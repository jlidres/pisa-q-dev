import express from 'express'
import { HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import type { Response } from 'express'
import { z } from 'zod'

type AssessmentPayload = {
  subject: string
  grade: string
  exportedAt?: string
  source?: string
  units: unknown[]
}

type AssessmentCollectionRow = {
  id: string
}

type AssessmentVersionRow = {
  id: string
  version_number: number
  status: 'draft' | 'published'
  payload: AssessmentPayload
  created_at: string
  published_at: string | null
}

type SessionPayload = {
  role: 'admin'
  sub: string
  name?: string
  exp: number
}

type AdminUserRecord = {
  username: string
  passwordHash: string
  displayName?: string
}

type SqlClient = ReturnType<typeof neon>

const assessmentSchema = z.object({
  subject: z.string().min(1),
  grade: z.string().min(1),
  exportedAt: z.string().optional(),
  source: z.string().optional(),
  actor: z.string().optional(),
  units: z.array(z.unknown()),
})

const publishSchema = z.object({
  subject: z.string().min(1),
  grade: z.string().min(1),
  actor: z.string().optional(),
})

const attemptSchema = z.object({
  subject: z.string().min(1),
  grade: z.string().min(1),
  studentProfile: z.record(z.string(), z.unknown()),
  responses: z.record(z.string(), z.unknown()),
  scoreSummary: z.record(z.string(), z.unknown()).optional(),
})

class AdminAuthService {
  private readonly sessionTtlMs = 1000 * 60 * 60 * 12

  createSession(username: string, password: string) {
    const user = this.findUser(username)

    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid admin credentials.')
    }

    const expiresAt = new Date(Date.now() + this.sessionTtlMs).toISOString()
    const payload: SessionPayload = {
      role: 'admin',
      sub: user.username,
      name: user.displayName,
      exp: Date.parse(expiresAt),
    }

    const encodedPayload = this.encode(payload)
    const signature = this.sign(encodedPayload)

    return {
      token: `${encodedPayload}.${signature}`,
      expiresAt,
      username: user.username,
      displayName: user.displayName ?? user.username,
    }
  }

  verifyAuthorizationHeader(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing admin authorization.')
    }

    const token = authorization.slice('Bearer '.length).trim()
    this.verifyToken(token)
  }

  private verifyToken(token: string) {
    const [encodedPayload, signature] = token.split('.')

    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid admin session token.')
    }

    const expectedSignature = Buffer.from(this.sign(encodedPayload))
    const actualSignature = Buffer.from(signature)

    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      throw new UnauthorizedException('Invalid admin session signature.')
    }

    const payload = this.decode(encodedPayload)

    if (payload.role !== 'admin' || !payload.sub || payload.exp <= Date.now()) {
      throw new UnauthorizedException('Admin session has expired.')
    }
  }

  private findUser(username: string) {
    const normalized = username.trim().toLowerCase()
    if (!normalized) {
      return null
    }

    return this.adminUsers.find((user) => user.username.toLowerCase() === normalized) ?? null
  }

  private verifyPassword(password: string, encodedHash: string) {
    const [algorithm, salt, hash] = encodedHash.split('$')

    if (algorithm !== 'scrypt' || !salt || !hash) {
      throw new ServiceUnavailableException('Invalid admin password hash format.')
    }

    const derived = scryptSync(password, salt, 64).toString('base64url')
    const expected = Buffer.from(hash)
    const actual = Buffer.from(derived)

    return expected.length === actual.length && timingSafeEqual(expected, actual)
  }

  private sign(value: string) {
    return createHmac('sha256', this.secret).update(value).digest('base64url')
  }

  private encode(payload: SessionPayload) {
    return Buffer.from(JSON.stringify(payload)).toString('base64url')
  }

  private decode(value: string) {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SessionPayload
    } catch {
      throw new UnauthorizedException('Invalid admin session payload.')
    }
  }

  private get secret() {
    return process.env.ADMIN_SESSION_SECRET || 'pisa-dev-admin-secret'
  }

  private get adminUsers() {
    const raw = process.env.ADMIN_USERS_JSON

    if (!raw) {
      throw new ServiceUnavailableException('ADMIN_USERS_JSON is not configured.')
    }

    try {
      const parsed = JSON.parse(raw) as AdminUserRecord[]
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('No admin users configured.')
      }

      return parsed.filter(
        (user) => Boolean(user.username?.trim()) && Boolean(user.passwordHash?.trim()),
      )
    } catch {
      throw new ServiceUnavailableException('ADMIN_USERS_JSON is invalid.')
    }
  }
}

class DatabaseService {
  private sqlClient: SqlClient | null = null
  private schemaReady: Promise<void> | null = null

  private get sql() {
    if (!this.sqlClient) {
      const url = process.env.DATABASE_URL
      if (!url) {
        throw new ServiceUnavailableException('DATABASE_URL is not configured.')
      }

      this.sqlClient = neon(url)
    }

    return this.sqlClient
  }

  async getHealth() {
    const databaseConfigured = Boolean(process.env.DATABASE_URL)

    if (!databaseConfigured) {
      return {
        status: 'ok',
        databaseConfigured,
        databaseReachable: false,
        timestamp: new Date().toISOString(),
      }
    }

    await this.ensureSchema()
    await this.sql`select 1 as ok`

    return {
      status: 'ok',
      databaseConfigured,
      databaseReachable: true,
      timestamp: new Date().toISOString(),
    }
  }

  async getPublishedAssessment(subject: string, grade: string) {
    await this.ensureSchema()

    const rows = await this.sql`
      select v.id, v.version_number, v.status, v.payload, v.created_at, v.published_at
      from assessment_versions v
      join assessment_collections c on c.id = v.assessment_id
      where c.subject = ${subject} and c.grade = ${grade} and v.status = 'published'
      order by v.version_number desc
      limit 1
    ` as AssessmentVersionRow[]

    return rows[0] ?? null
  }

  async getLatestDraft(subject: string, grade: string) {
    await this.ensureSchema()

    const rows = await this.sql`
      select v.id, v.version_number, v.status, v.payload, v.created_at, v.published_at
      from assessment_versions v
      join assessment_collections c on c.id = v.assessment_id
      where c.subject = ${subject} and c.grade = ${grade} and v.status = 'draft'
      order by v.version_number desc
      limit 1
    ` as AssessmentVersionRow[]

    return rows[0] ?? null
  }

  async saveDraft(payload: unknown) {
    const draft = assessmentSchema.parse(payload)
    await this.ensureSchema()

    const collection = await this.ensureCollection(draft.subject, draft.grade)
    const versionNumber = await this.nextVersion(collection.id)
    const serializedPayload = JSON.stringify(draft)

    const rows = await this.sql`
      insert into assessment_versions (assessment_id, version_number, status, payload, created_by)
      values (${collection.id}, ${versionNumber}, 'draft', ${serializedPayload}::jsonb, ${draft.actor ?? 'admin'})
      returning id, version_number, status, payload, created_at, published_at
    ` as AssessmentVersionRow[]

    await this.touchCollection(collection.id)

    return rows[0]
  }

  async publishDraft(payload: unknown) {
    const request = publishSchema.parse(payload)
    await this.ensureSchema()

    const collection = await this.ensureCollection(request.subject, request.grade)
    const latestDraft = await this.getLatestDraft(request.subject, request.grade)

    if (!latestDraft) {
      throw new ServiceUnavailableException('No draft found to publish.')
    }

    const versionNumber = await this.nextVersion(collection.id)
    const serializedPayload = JSON.stringify(latestDraft.payload)

    const rows = await this.sql`
      insert into assessment_versions (
        assessment_id,
        version_number,
        status,
        payload,
        created_by,
        published_at
      )
      values (
        ${collection.id},
        ${versionNumber},
        'published',
        ${serializedPayload}::jsonb,
        ${request.actor ?? 'admin'},
        now()
      )
      returning id, version_number, status, payload, created_at, published_at
    ` as AssessmentVersionRow[]

    await this.touchCollection(collection.id)

    return rows[0]
  }

  async saveAttempt(payload: unknown) {
    const attempt = attemptSchema.parse(payload)
    await this.ensureSchema()

    const published = await this.getPublishedAssessment(attempt.subject, attempt.grade)
    const serializedProfile = JSON.stringify(attempt.studentProfile)
    const serializedResponses = JSON.stringify(attempt.responses)
    const serializedSummary = JSON.stringify(attempt.scoreSummary ?? {})

    const rows = await this.sql`
      insert into student_attempts (
        assessment_version_id,
        subject,
        grade,
        student_profile,
        responses,
        score_summary
      )
      values (
        ${published?.id ?? null},
        ${attempt.subject},
        ${attempt.grade},
        ${serializedProfile}::jsonb,
        ${serializedResponses}::jsonb,
        ${serializedSummary}::jsonb
      )
      returning id, submitted_at
    ` as Array<{ id: string; submitted_at: string }>

    return rows[0]
  }

  async getAnalytics(subject?: string, grade?: string) {
    await this.ensureSchema()

    const filters = subject && grade
      ? this.sql`
          select count(*)::int as total_attempts, max(submitted_at) as latest_attempt_at
          from student_attempts
          where subject = ${subject} and grade = ${grade}
        `
      : this.sql`
          select count(*)::int as total_attempts, max(submitted_at) as latest_attempt_at
          from student_attempts
        `

    const rows = (await filters) as Array<{ total_attempts: number; latest_attempt_at: string | null }>

    return {
      totalAttempts: rows[0]?.total_attempts ?? 0,
      latestAttemptAt: rows[0]?.latest_attempt_at ?? null,
      scope: {
        subject: subject ?? null,
        grade: grade ?? null,
      },
    }
  }

  private async ensureCollection(subject: string, grade: string) {
    const existing = await this.sql`
      select id from assessment_collections where subject = ${subject} and grade = ${grade} limit 1
    ` as AssessmentCollectionRow[]

    if (existing[0]) {
      return existing[0]
    }

    const inserted = await this.sql`
      insert into assessment_collections (subject, grade)
      values (${subject}, ${grade})
      returning id
    ` as AssessmentCollectionRow[]

    return inserted[0]
  }

  private async nextVersion(assessmentId: string) {
    const rows = await this.sql`
      select coalesce(max(version_number), 0)::int + 1 as next_version
      from assessment_versions
      where assessment_id = ${assessmentId}
    ` as Array<{ next_version: number }>

    return rows[0]?.next_version ?? 1
  }

  private async touchCollection(collectionId: string) {
    await this.sql`
      update assessment_collections
      set updated_at = now()
      where id = ${collectionId}
    `
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.runSchemaSetup()
    }

    return this.schemaReady
  }

  private async runSchemaSetup() {
    await this.sql`create extension if not exists pgcrypto`

    await this.sql`
      create table if not exists assessment_collections (
        id uuid primary key default gen_random_uuid(),
        subject text not null,
        grade text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (subject, grade)
      )
    `

    await this.sql`
      create table if not exists assessment_versions (
        id uuid primary key default gen_random_uuid(),
        assessment_id uuid not null references assessment_collections(id) on delete cascade,
        version_number integer not null,
        status text not null check (status in ('draft', 'published')),
        payload jsonb not null,
        created_by text,
        created_at timestamptz not null default now(),
        published_at timestamptz,
        unique (assessment_id, version_number)
      )
    `

    await this.sql`
      create table if not exists student_attempts (
        id uuid primary key default gen_random_uuid(),
        assessment_version_id uuid references assessment_versions(id) on delete set null,
        subject text not null,
        grade text not null,
        student_profile jsonb not null,
        responses jsonb not null,
        score_summary jsonb,
        submitted_at timestamptz not null default now()
      )
    `

    await this.sql`
      create index if not exists idx_assessment_versions_lookup
      on assessment_versions (assessment_id, status, created_at desc)
    `

    await this.sql`
      create index if not exists idx_student_attempts_lookup
      on student_attempts (subject, grade, submitted_at desc)
    `
  }
}

export async function createApiServer(expressApp: ReturnType<typeof express>) {
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

function handleError(error: unknown, res: Response) {
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
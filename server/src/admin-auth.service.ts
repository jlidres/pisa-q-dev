import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto'

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

export class AdminAuthService {
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
import { Body, Controller, Get, Headers, Inject, Post, Put, Query } from '@nestjs/common'

import { AdminAuthService } from './admin-auth.service'
import { DatabaseService } from './database.service'

@Controller()
export class AppController {
  constructor(
    @Inject(AdminAuthService) private readonly auth: AdminAuthService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  @Get('health')
  getHealth() {
    return this.database.getHealth()
  }

  @Get('assessments/published')
  async getPublished(@Query('subject') subject: string, @Query('grade') grade: string) {
    const published = await this.database.getPublishedAssessment(subject, grade)
    return {
      data: published,
    }
  }

  @Post('admin/session')
  createAdminSession(@Body() body: unknown) {
    const username = typeof body === 'object' && body && 'username' in body ? body.username : undefined
    const password = typeof body === 'object' && body && 'password' in body ? body.password : undefined
    return this.auth.createSession(
      typeof username === 'string' ? username : '',
      typeof password === 'string' ? password : '',
    )
  }

  @Get('admin/drafts')
  async getDraft(
    @Headers('authorization') authorization: string | undefined,
    @Query('subject') subject: string,
    @Query('grade') grade: string,
  ) {
    this.auth.verifyAuthorizationHeader(authorization)
    const draft = await this.database.getLatestDraft(subject, grade)
    return {
      data: draft,
    }
  }

  @Put('admin/drafts')
  saveDraft(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    this.auth.verifyAuthorizationHeader(authorization)
    return this.database.saveDraft(body)
  }

  @Post('admin/publish')
  publishDraft(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    this.auth.verifyAuthorizationHeader(authorization)
    return this.database.publishDraft(body)
  }

  @Post('attempts')
  saveAttempt(@Body() body: unknown) {
    return this.database.saveAttempt(body)
  }

  @Get('analytics/overview')
  getAnalytics(
    @Headers('authorization') authorization: string | undefined,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
  ) {
    this.auth.verifyAuthorizationHeader(authorization)
    return this.database.getAnalytics(subject, grade)
  }
}
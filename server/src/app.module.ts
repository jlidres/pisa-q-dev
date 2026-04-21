import { Module } from '@nestjs/common'

import { AdminAuthService } from './admin-auth.service.js'
import { AppController } from './app.controller.js'
import { DatabaseService } from './database.service.js'

@Module({
  controllers: [AppController],
  providers: [AdminAuthService, DatabaseService],
})
export class AppModule {}
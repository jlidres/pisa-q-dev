import { Module } from '@nestjs/common'

import { AdminAuthService } from './admin-auth.service'
import { AppController } from './app.controller'
import { DatabaseService } from './database.service'

@Module({
  controllers: [AppController],
  providers: [AdminAuthService, DatabaseService],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { MailService } from './mail/mail.service';

@Module({
  imports: [
    // 🔧 Config global
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 🚦 Rate Limiting (Enterprise security)
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,   // 60 ثانیه
          limit: 10, // 10 request در دقیقه
        },
      ],
    }),

    // 📦 App modules
    PrismaModule,
    AuthModule,
    UserModule,
  ],

  providers: [
    // 🔐 Global rate limit guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    MailService,
  ],
})
export class AppModule { }
// bot.module.ts (yangilangan: ReportBotService qo'shildi)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { BotService } from './bot.service';
import { ReportBotService } from '../report-bot/report-bot.service'; // Yangi service qo'shildi
import { BotController } from './bot.controller';
import { Message, MessageSchema } from './message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
  ],
  controllers: [BotController],
  providers: [BotService, ReportBotService], // ReportBotService qo'shildi
})
export class BotModule {}

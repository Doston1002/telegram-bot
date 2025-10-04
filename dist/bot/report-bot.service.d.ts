import { type OnModuleInit } from '@nestjs/common';
import type { Model } from 'mongoose';
import { Message } from './message.entity';
export declare class ReportBotService implements OnModuleInit {
  private messageModel;
  private bot;
  private startTime;
  constructor(messageModel: Model<Message>);
  onModuleInit(): Promise<void>;
  private setupHandlers;
}

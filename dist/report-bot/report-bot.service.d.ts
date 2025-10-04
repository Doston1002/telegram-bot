import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { Message } from '../bot/message.entity';
export declare class ReportBotService implements OnModuleInit {
  private messageModel;
  private bot;
  private startTime;
  constructor(messageModel: Model<Message>);
  onModuleInit(): Promise<void>;
  private setupHandlers;
}

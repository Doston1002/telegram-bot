import { type OnModuleInit } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { MessageDocument } from './message.entity';
export declare class BotService implements OnModuleInit {
  private bot;
  private userSteps;
  private messageModel;
  constructor();
  onModuleInit(): Promise<void>;
  startBot(): void;
  setMessageModel(messageModel: Model<MessageDocument>): void;
}

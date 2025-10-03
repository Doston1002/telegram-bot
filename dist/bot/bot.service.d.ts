import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { MessageDocument } from './message.entity';
export declare class BotService implements OnModuleInit {
    private messageModel;
    private bot;
    private userSteps;
    constructor(messageModel: Model<MessageDocument>);
    onModuleInit(): Promise<void>;
    startBot(): void;
}

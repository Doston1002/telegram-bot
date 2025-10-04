import { Response } from 'express';
import { Model } from 'mongoose';
import { Message } from './message.entity';
export declare class BotController {
    private readonly messageModel;
    constructor(messageModel: Model<Message>);
    downloadExcel(res: Response): Promise<Response<any, Record<string, any>>>;
}

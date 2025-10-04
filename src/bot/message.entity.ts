import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  chatId: string;

  @Prop()
  firstName?: string;

  @Prop()
  gender?: string;

  @Prop()
  region?: string;

  @Prop()
  district?: string;

  @Prop()
  schoolNumber?: number;

  @Prop()
  address?: string;

  @Prop()
  grade?: string;

  @Prop({ type: Date })
  birthDate?: Date;

  @Prop()
  educationType?: string;

  @Prop()
  specialization?: string;

  @Prop()
  phoneNumber?: string;

  @Prop({ type: Object })
  meta: Record<string, any>;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

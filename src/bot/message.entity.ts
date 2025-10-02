// message.entity.ts (yangilangan: birthDate va phoneNumber qo'shildi)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop()
  chatId: string;

  @Prop()
  firstName: string;

  @Prop()
  region: string;

  @Prop()
  district: string;

  @Prop()
  schoolNumber: number;

  @Prop()
  grade: string; // 3–10 sinf

  @Prop()
  educationType: string; // Inklyuziv / Yakka tartibdagi

  @Prop()
  specialization: string; // Estrada-vokal / An’anaviy ijrochilik / Tasviriy san’at / Boshqa

  @Prop({ type: Date })
  birthDate: Date; // Tug'ilgan kun (YYYY-MM-DD formatida saqlanadi)

  @Prop()
  phoneNumber: string; // Telefon raqam (+998 formatida)
}

export const MessageSchema = SchemaFactory.createForClass(Message);

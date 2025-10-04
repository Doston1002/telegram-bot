/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/inferschematype" />
/// <reference types="mongoose/types/inferrawdoctype" />
import type { Document } from 'mongoose';
export type MessageDocument = Message & Document;
export declare class Message {
  chatId: string;
  firstName?: string;
  gender?: string;
  birthDate?: Date;
  region?: string;
  district?: string;
  schoolNumber?: number;
  address?: string;
  grade?: string;
  educationType?: string;
  specialization?: string;
  disabilityGroup?: string;
  phoneNumber?: string;
  meta: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}
export declare const MessageSchema: import('mongoose').Schema<
  Message,
  import('mongoose').Model<
    Message,
    any,
    any,
    any,
    Document<unknown, any, Message, any, {}> &
      Message & {
        _id: import('mongoose').Types.ObjectId;
      } & {
        __v: number;
      },
    any
  >,
  {},
  {},
  {},
  {},
  import('mongoose').DefaultSchemaOptions,
  Message,
  Document<
    unknown,
    {},
    import('mongoose').FlatRecord<Message>,
    {},
    import('mongoose').ResolveSchemaOptions<import('mongoose').DefaultSchemaOptions>
  > &
    import('mongoose').FlatRecord<Message> & {
      _id: import('mongoose').Types.ObjectId;
    } & {
      __v: number;
    }
>;

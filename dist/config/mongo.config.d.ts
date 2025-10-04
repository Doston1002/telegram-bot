import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';
export declare const getMongoDBConfig: (
  configService: ConfigService,
) => Promise<MongooseModuleOptions>;

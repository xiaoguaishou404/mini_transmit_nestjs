import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { DatabaseService } from '../../services/database.service';
import { StorageService } from '../../services/storage.service';

@Module({
  imports: [
    MulterModule.register({
      // 使用内存存储，文件将上传到Supabase Storage
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, DatabaseService, StorageService],
  exports: [MessagesService],
})
export class MessagesModule {} 
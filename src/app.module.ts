import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ChatModule } from './modules/chat/chat.module';
import { DatabaseService } from './services/database.service';
import { StorageService } from './services/storage.service';

@Module({
  imports: [
    UsersModule,
    RoomsModule,
    MessagesModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService, StorageService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly storageService: StorageService) {}

  async onModuleInit() {
    // 初始化Supabase Storage存储桶
    await this.storageService.initializeBucket();
  }
}

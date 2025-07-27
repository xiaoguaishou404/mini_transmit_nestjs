import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MessagesModule } from './modules/messages/messages.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { DatabaseService } from './services/database.service';
import { StorageService } from './services/storage.service';
import { WebSocketService } from './services/websocket.service';

@Module({
  imports: [
    UsersModule,
    RoomsModule,
    MessagesModule,
    TokensModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService, StorageService, WebSocketService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly storageService: StorageService) {}

  async onModuleInit() {
    // 初始化Supabase Storage存储桶
    await this.storageService.initializeBucket();
  }
}

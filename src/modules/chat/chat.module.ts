import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '../messages/messages.module';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';
import { DatabaseService } from '../../services/database.service';

@Module({
  imports: [MessagesModule, RoomsModule, UsersModule],
  providers: [ChatGateway, DatabaseService],
  exports: [ChatGateway],
})
export class ChatModule {} 
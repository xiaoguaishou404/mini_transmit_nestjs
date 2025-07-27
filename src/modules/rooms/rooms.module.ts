import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { DatabaseService } from '../../services/database.service';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, DatabaseService],
  exports: [RoomsService],
})
export class RoomsModule {} 
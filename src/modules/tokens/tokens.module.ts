import { Module } from '@nestjs/common';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { DatabaseService } from '../../services/database.service';

@Module({
  controllers: [TokensController],
  providers: [TokensService, DatabaseService],
  exports: [TokensService],
})
export class TokensModule {} 
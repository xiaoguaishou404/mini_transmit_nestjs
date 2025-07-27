import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { TokenResponseDto } from '../../common/dto/token.dto';

@Injectable()
export class TokensService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getTokenInfo(token: string): Promise<TokenResponseDto | null> {
    const user = await this.databaseService.getUserByToken(token);
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      userNickname: user.nickname,
      userAvatar: user.avatar,
      createdAt: new Date(user.created_at),
    };
  }
} 
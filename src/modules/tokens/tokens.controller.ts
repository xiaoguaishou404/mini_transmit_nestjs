import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { TokenResponseDto } from '../../common/dto/token.dto';

@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get(':token')
  async getTokenInfo(@Param('token') token: string): Promise<TokenResponseDto> {
    const tokenInfo = await this.tokensService.getTokenInfo(token);
    if (!tokenInfo) {
      throw new HttpException('Token不存在或已失效', HttpStatus.NOT_FOUND);
    }
    return tokenInfo;
  }
} 
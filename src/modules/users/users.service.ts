import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../common/interfaces/entities.interface';
import { CreateUserDto, UserResponseDto } from '../../common/dto/user.dto';
import { DatabaseService } from '../../services/database.service';
import { appConfig } from '../../config/supabase.config';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  private generateRandomNickname(): string {
    const adjectives = ['快乐的', '聪明的', '友善的', '活泼的', '可爱的', '勇敢的', '温暖的', '阳光的'];
    const nouns = ['小熊', '兔子', '狐狸', '小鸟', '猫咪', '小鹿', '松鼠', '企鹅'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);
    
    return `${adjective}${noun}${number}`;
  }

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // 生成随机昵称和token
    const nickname = this.generateRandomNickname();
    const qrToken = uuidv4();
    
    // 生成扫码链接（前端将根据此链接生成二维码图片）
    const scanUrl = `${appConfig.frontendUrl}/#/pages/chat/chat-entry?token=${qrToken}`;
    
    const dbUser = await this.databaseService.createUser({
      nickname,
      avatar: createUserDto.avatar,
      scan_url: scanUrl,      // 存储链接而不是图片
      qr_token: qrToken,
    });

    return {
      id: dbUser.id,
      nickname: dbUser.nickname,
      avatar: dbUser.avatar,
      scanUrl: scanUrl,       // 返回链接
      qrToken: qrToken,
      createdAt: new Date(dbUser.created_at),
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    const dbUser = await this.databaseService.getUserById(userId);
    if (!dbUser) return null;

    return {
      id: dbUser.id,
      nickname: dbUser.nickname,
      avatar: dbUser.avatar,
      scanUrl: dbUser.scan_url,    // 返回链接
      qrToken: dbUser.qr_token,
      createdAt: new Date(dbUser.created_at),
    };
  }
} 
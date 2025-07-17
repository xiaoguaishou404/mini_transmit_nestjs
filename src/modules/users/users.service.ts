import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { User } from '../../common/interfaces/entities.interface';
import { CreateUserDto, UserResponseDto, ScanQrCodeDto } from '../../common/dto/user.dto';
import { DatabaseService } from '../../services/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // 先创建用户记录以获取UUID
    const tempQrCode = 'temp'; // 临时占位符
    
    const dbUser = await this.databaseService.createUser({
      nickname: createUserDto.nickname,
      avatar: createUserDto.avatar,
      qr_code: tempQrCode,
    });

    // 使用数据库生成的UUID创建二维码
    const qrCodeData = JSON.stringify({ 
      type: 'user_qr', 
      userId: dbUser.id,
      timestamp: Date.now()
    });
    
    // 生成二维码
    const qrCode = await QRCode.toDataURL(qrCodeData);
    
    // 更新用户的二维码
    await this.databaseService.updateUser(dbUser.id, { qr_code: qrCode });

    return {
      id: dbUser.id,
      nickname: dbUser.nickname,
      avatar: dbUser.avatar,
      qrCode: qrCode,
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
      qrCode: dbUser.qr_code,
      createdAt: new Date(dbUser.created_at),
    };
  }

  async getUserQrCode(userId: string): Promise<string | null> {
    const dbUser = await this.databaseService.getUserById(userId);
    return dbUser ? dbUser.qr_code : null;
  }

  async validateQrCode(qrCodeData: string): Promise<{ userId: string } | null> {
    try {
      const data = JSON.parse(qrCodeData);
      if (data.type === 'user_qr' && data.userId) {
        const user = await this.databaseService.getUserById(data.userId);
        if (user) {
          return { userId: data.userId };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    const dbUsers = await this.databaseService.getAllUsers();
    return dbUsers.map(user => ({
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      qrCode: user.qr_code,
      createdAt: new Date(user.created_at),
    }));
  }
} 
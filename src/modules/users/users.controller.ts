import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UserResponseDto, ScanQrCodeDto } from '../../common/dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createUser(createUserDto);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.getUserById(id);
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      qrCode: user.qrCode,
      createdAt: user.createdAt,
    };
  }

  @Get(':id/qrcode')
  async getUserQrCode(@Param('id') id: string): Promise<{ qrCode: string }> {
    const qrCode = await this.usersService.getUserQrCode(id);
    if (!qrCode) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }
    return { qrCode };
  }

  @Post('scan-qr')
  async scanQrCode(@Body() scanQrCodeDto: ScanQrCodeDto): Promise<{ message: string; roomId?: string }> {
    const validation = await this.usersService.validateQrCode(
      JSON.stringify({ type: 'user_qr', userId: scanQrCodeDto.userId })
    );
    
    if (!validation) {
      throw new HttpException('无效的二维码', HttpStatus.BAD_REQUEST);
    }

    // 这里应该调用房间服务创建聊天室，暂时返回成功消息
    return { 
      message: '扫码成功，正在创建聊天室...',
      roomId: 'temp-room-id' // 临时返回，后续会被房间服务替换
    };
  }

  @Get()
  async getAllUsers(): Promise<UserResponseDto[]> {
    return this.usersService.getAllUsers();
  }
} 
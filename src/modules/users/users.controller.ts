import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UserResponseDto } from '../../common/dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

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
      scanUrl: user.scanUrl,    // 返回扫码链接
      qrToken: user.qrToken,
      createdAt: user.createdAt,
    };
  }


} 
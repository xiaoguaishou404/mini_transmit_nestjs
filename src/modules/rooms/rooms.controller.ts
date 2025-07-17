import { Controller, Post, Get, Body, Param, HttpException, HttpStatus, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, RoomResponseDto } from '../../common/dto/room.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async createRoom(@Body() createRoomDto: CreateRoomDto): Promise<RoomResponseDto> {
    return this.roomsService.createRoom(createRoomDto);
  }

  @Get(':id')
  async getRoomById(@Param('id') id: string): Promise<RoomResponseDto> {
    const room = await this.roomsService.getRoomById(id);
    if (!room) {
      throw new HttpException('聊天室不存在', HttpStatus.NOT_FOUND);
    }
    return {
      id: room.id,
      ownerId: room.ownerId,
      participants: room.participants,
      lastMessage: room.lastMessage,
      lastMessageTime: room.lastMessageTime,
      createdAt: room.createdAt,
    };
  }

  @Get()
  async getRooms(@Query('userId') userId?: string): Promise<RoomResponseDto[]> {
    if (userId) {
      return this.roomsService.getRoomsByUserId(userId);
    }
    return this.roomsService.getAllRooms();
  }

  @Get(':id/check-access/:userId')
  async checkUserAccess(
    @Param('id') roomId: string,
    @Param('userId') userId: string,
  ): Promise<{ hasAccess: boolean }> {
    const hasAccess = await this.roomsService.isUserInRoom(roomId, userId);
    return { hasAccess };
  }
} 
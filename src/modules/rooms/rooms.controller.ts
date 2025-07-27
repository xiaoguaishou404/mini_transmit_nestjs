import { Controller, Post, Get, Body, Param, HttpException, HttpStatus, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JoinOrCreateRoomDto, RoomResponseDto } from '../../common/dto/room.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async joinOrCreateRoom(@Body() joinOrCreateRoomDto: JoinOrCreateRoomDto): Promise<RoomResponseDto> {
    return this.roomsService.joinOrCreateRoom(joinOrCreateRoomDto);
  }

  @Get(':id')
  async getRoomById(@Param('id') id: string): Promise<RoomResponseDto> {
    const room = await this.roomsService.getRoomById(id);
    if (!room) {
      throw new HttpException('聊天室不存在', HttpStatus.NOT_FOUND);
    }
    return {
      id: room.id,
      participants: room.participants,
      createdAt: room.createdAt,
    };
  }
} 
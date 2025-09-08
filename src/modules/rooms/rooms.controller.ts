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

  @Get('user/:userId')
  async getUserRooms(@Param('userId') userId: string): Promise<RoomResponseDto[]> {
    return this.roomsService.getRoomsByUserId(userId);
  }
} 
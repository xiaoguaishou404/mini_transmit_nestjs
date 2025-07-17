import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from '../messages/messages.service';
import { RoomsService } from '../rooms/rooms.service';
import { UsersService } from '../users/users.service';
import { CreateMessageDto, MessageType } from '../../common/dto/message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, { socket: Socket; userId: string }> = new Map();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly roomsService: RoomsService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`客户端连接: ${client.id}`);
    
    // 可以在这里进行身份验证
    const userId = client.handshake.auth?.userId;
    if (userId) {
      this.connectedUsers.set(client.id, { socket: client, userId });
      console.log(`用户 ${userId} 已连接`);
    }
  }

  async handleDisconnect(client: Socket) {
    console.log(`客户端断开连接: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = data;
    
    // 验证用户是否有权限加入房间
    const hasAccess = await this.roomsService.isUserInRoom(roomId, userId);
    if (!hasAccess) {
      client.emit('error', { message: '无权限加入该聊天室' });
      return;
    }

    // 加入房间
    client.join(roomId);
    client.emit('joined_room', { roomId });
    
    // 通知房间内其他用户
    client.to(roomId).emit('user_joined', { userId, roomId });
    
    console.log(`用户 ${userId} 加入房间 ${roomId}`);
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = data;
    
    client.leave(roomId);
    client.emit('left_room', { roomId });
    
    // 通知房间内其他用户
    client.to(roomId).emit('user_left', { userId, roomId });
    
    console.log(`用户 ${userId} 离开房间 ${roomId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; type: MessageType; content?: string },
  ) {
    const { roomId, userId, type, content } = data;
    
    // 验证用户权限
    const hasAccess = await this.roomsService.isUserInRoom(roomId, userId);
    if (!hasAccess) {
      client.emit('error', { message: '无权限在该聊天室发送消息' });
      return;
    }

    // 获取用户信息
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      client.emit('error', { message: '用户不存在' });
      return;
    }

    // 创建消息
    const createMessageDto: CreateMessageDto = {
      roomId,
      senderId: userId,
      type,
      content,
    };

    const message = await this.messagesService.createMessage(createMessageDto, user.nickname);
    
    // 更新房间最后消息
    await this.roomsService.updateLastMessage(roomId, content || '发送了一个文件');

    // 广播消息到房间内所有用户
    this.server.to(roomId).emit('new_message', message);
    
    console.log(`用户 ${userId} 在房间 ${roomId} 发送了消息`);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; isTyping: boolean },
  ) {
    const { roomId, userId, isTyping } = data;
    
    // 广播打字状态到房间内其他用户
    client.to(roomId).emit('user_typing', { userId, isTyping });
  }

  @SubscribeMessage('scan_qr_code')
  async handleScanQrCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; scannerNickname: string; scannerAvatar?: string },
  ) {
    const { userId, scannerNickname, scannerAvatar } = data;
    
    // 验证二维码对应的用户是否存在
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      client.emit('error', { message: '无效的二维码' });
      return;
    }

    // 创建临时扫码者ID
    const scannerId = `scanner_${Date.now()}`;
    
    // 创建聊天室
    const room = await this.roomsService.createRoom({
      ownerId: userId,
      participantId: scannerId,
      participantNickname: scannerNickname,
      participantAvatar: scannerAvatar,
    });

    // 通知二维码拥有者有人扫码
    const ownerConnection = Array.from(this.connectedUsers.values()).find(
      (conn) => conn.userId === userId
    );
    
    if (ownerConnection) {
      ownerConnection.socket.emit('qr_code_scanned', {
        roomId: room.id,
        scannerNickname,
        scannerAvatar,
      });
    }

    // 返回聊天室信息给扫码者
    client.emit('room_created', {
      roomId: room.id,
      participantId: scannerId,
    });

    console.log(`用户 ${scannerNickname} 扫描了用户 ${userId} 的二维码，创建房间 ${room.id}`);
  }
} 
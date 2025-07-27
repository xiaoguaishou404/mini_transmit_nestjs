import { Injectable } from '@nestjs/common';
import { WebSocketServer, WebSocket } from 'ws';
import { MessagesService } from '../modules/messages/messages.service';
import { RoomsService } from '../modules/rooms/rooms.service';
import { UsersService } from '../modules/users/users.service';
import { DatabaseService } from './database.service';
import { CreateMessageDto, MessageType } from '../common/dto/message.dto';
import * as url from 'url';
import { IncomingMessage } from 'http';

interface ConnectedUser {
  ws: WebSocket;
  userId: string;
  userNickname: string;
  connectedAt: Date;
}

interface WebSocketMessage {
  type: string;
  data: any;
}

@Injectable()
export class WebSocketService {
  private wss: WebSocketServer;
  private connectedUsers: Map<string, ConnectedUser> = new Map(); // userId -> ConnectedUser

  constructor(
    private readonly messagesService: MessagesService,
    private readonly roomsService: RoomsService,
    private readonly usersService: UsersService,
    private readonly databaseService: DatabaseService,
  ) {}

  initialize(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/socket',
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    console.log('WebSocket服务已初始化');
  }

  private async handleConnection(ws: WebSocket, request: IncomingMessage) {
    // 解析查询参数获取用户ID
    const query = url.parse(request.url || '', true).query;
    const userId = query.userId as string;

    if (!userId) {
      this.sendError(ws, '缺少用户ID参数');
      ws.close();
      return;
    }

    try {
      // 验证用户是否存在
      const user = await this.usersService.getUserById(userId);
      if (!user) {
        this.sendError(ws, '用户不存在');
        ws.close();
        return;
      }

      // 如果用户已经连接，关闭旧连接
      const existingConnection = this.connectedUsers.get(userId);
      if (existingConnection) {
        console.log(`用户 ${userId} 的旧连接将被关闭`);
        existingConnection.ws.close();
      }

      // 记录新连接
      const connectedUser: ConnectedUser = {
        ws,
        userId,
        userNickname: user.nickname,
        connectedAt: new Date(),
      };

      this.connectedUsers.set(userId, connectedUser);
      
      console.log(`用户连接成功: ${user.nickname} (${userId})`);

      // 设置消息处理
      ws.on('message', (data: Buffer) => {
        this.handleMessage(userId, data);
      });

      ws.on('close', () => {
        this.handleDisconnect(userId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket错误 (用户${userId}):`, error);
      });

      // 发送连接确认
      this.sendToUser(userId, { 
        type: 'connected', 
        data: { 
          userId, 
          nickname: user.nickname,
          connectedAt: connectedUser.connectedAt 
        } 
      });

    } catch (error) {
      console.error('用户连接验证失败:', error);
      this.sendError(ws, '连接验证失败');
      ws.close();
    }
  }

  private handleMessage(userId: string, data: Buffer) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'send_message':
          this.handleSendMessage(userId, message.data);
          break;
        default:
          this.sendErrorToUser(userId, `未知的消息类型: ${message.type}`);
      }
    } catch (error) {
      console.error(`消息解析错误 (用户${userId}):`, error);
      this.sendErrorToUser(userId, '消息格式错误');
    }
  }

  private async handleSendMessage(userId: string, data: { 
    roomId: string; 
    type: MessageType; 
    content?: string;
    fileName?: string;
    fileUrl?: string;
  }) {
    const { roomId, type, content, fileName, fileUrl } = data;

    try {
      // 关键安全验证：检查用户是否有权限在该房间发送消息
      const hasAccess = await this.roomsService.isUserInRoom(roomId, userId);
      if (!hasAccess) {
        this.sendErrorToUser(userId, '无权限在该聊天室发送消息');
        return;
      }

      // 获取用户信息
      const connectedUser = this.connectedUsers.get(userId);
      if (!connectedUser) {
        this.sendErrorToUser(userId, '连接状态异常');
        return;
      }

      // 创建消息记录
      const createMessageDto: CreateMessageDto = {
        roomId,
        senderId: userId,
        type,
        content,
        fileName,
        fileUrl,
      };

      const message = await this.messagesService.createMessage(createMessageDto);
      
      // 获取房间内所有用户并广播消息
      await this.broadcastToRoom(roomId, {
        type: 'new_message',
        data: message
      });

      console.log(`用户 ${connectedUser.userNickname} 在房间 ${roomId} 发送了${type}消息`);
    } catch (error) {
      console.error('发送消息错误:', error);
      this.sendErrorToUser(userId, '发送消息失败');
    }
  }

  private handleDisconnect(userId: string) {
    const connectedUser = this.connectedUsers.get(userId);
    if (connectedUser) {
      this.connectedUsers.delete(userId);
      console.log(`用户断开连接: ${connectedUser.userNickname} (${userId})`);
    }
  }

  private sendToUser(userId: string, message: WebSocketMessage) {
    const connectedUser = this.connectedUsers.get(userId);
    if (connectedUser && connectedUser.ws.readyState === WebSocket.OPEN) {
      connectedUser.ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, errorMessage: string) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: errorMessage }
      }));
    }
  }

  private sendErrorToUser(userId: string, errorMessage: string) {
    this.sendToUser(userId, {
      type: 'error',
      data: { message: errorMessage }
    });
  }

  private async broadcastToRoom(roomId: string, message: WebSocketMessage) {
    try {
      // 通过数据库服务获取房间内所有参与者
      const roomParticipants = await this.databaseService.getRoomParticipants(roomId);
      const roomUserIds = roomParticipants.map(participant => participant.user_id);
      
      // 向在线用户广播消息
      let onlineCount = 0;
      roomUserIds.forEach(userId => {
        const connectedUser = this.connectedUsers.get(userId);
        if (connectedUser && connectedUser.ws.readyState === WebSocket.OPEN) {
          connectedUser.ws.send(JSON.stringify(message));
          onlineCount++;
        }
      });

      console.log(`房间 ${roomId} 消息已广播给 ${onlineCount}/${roomUserIds.length} 在线用户`);
    } catch (error) {
      console.error('广播消息到房间失败:', error);
    }
  }

 

 

} 
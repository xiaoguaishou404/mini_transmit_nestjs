import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): object {
    return {
      message: this.appService.getHello(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        users: '/api/users',
        rooms: '/api/rooms',
        messages: '/api/messages',
        websocket: 'ws://localhost:3000/socket',
        uploads: '/uploads'
      }
    };
  }

  @Get('health')
  getHealth(): object {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '微传递后端服务'
    };
  }
}

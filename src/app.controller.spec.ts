import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API information object', () => {
      const result = appController.getHello();
      
      expect(result).toHaveProperty('message', '欢迎使用微传递API服务！');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('endpoints');
      
      const resultObj = result as any;
      expect(resultObj.endpoints).toHaveProperty('users', '/api/users');
      expect(resultObj.endpoints).toHaveProperty('rooms', '/api/rooms');
      expect(resultObj.endpoints).toHaveProperty('messages', '/api/messages');
      expect(resultObj.endpoints).toHaveProperty('websocket', 'ws://localhost:3000');
      expect(resultObj.endpoints).toHaveProperty('uploads', '/uploads');
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = appController.getHealth();
      
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service', '微传递后端服务');
    });
  });
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // 启用CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // 添加全局前缀
  app.setGlobalPrefix('api');

  const port = process.env.NESTJS_PORT;
  if (!port) {
    throw new Error('环境变量 NESTJS_PORT 未设置，请在 .env 文件中配置 NESTJS_PORT');
  }
  
  await app.listen(port);
  
  console.log(`🚀 微传递后端服务已启动，监听端口: ${port}`);
  console.log(`📄 API文档地址: http://localhost:${port}/api`);
  console.log(`🔌 WebSocket连接地址: ws://localhost:${port}`);
}
bootstrap();

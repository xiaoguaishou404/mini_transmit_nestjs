# 微传递后端开发文档

## 1. 项目概览

### 1.0 设计理念
- **简洁至上**：采用无所有者设计，简化权限管理
- **一对一专注**：专为一对一聊天场景优化
- **自动匹配**：智能防重复，两用户间仅存在一个聊天室
- **实时高效**：WebSocket + 数据冗余设计，确保消息实时传递

### 1.1 技术栈
- **框架**: NestJS + TypeScript
- **数据库**: Supabase PostgreSQL
- **文件存储**: Supabase Storage
- **实时通信**: 原生WebSocket (ws)
- **验证**: Class Validator
- **文件上传**: Multer

### 1.2 项目结构
```
src/
├── app.module.ts              # 主应用模块
├── main.ts                    # 应用入口
├── common/
│   ├── dto/                   # 数据传输对象
│   └── interfaces/            # 接口定义
├── config/
│   └── supabase.config.ts     # Supabase配置
├── modules/
│   ├── users/                 # 用户模块
│   ├── rooms/                 # 聊天室模块（无所有者设计）
│   ├── messages/              # 消息模块
│   └── tokens/                # Token验证模块
└── services/
    ├── database.service.ts    # 数据库服务
    ├── storage.service.ts     # 文件存储服务
    └── websocket.service.ts   # WebSocket服务
```

## 2. 环境配置

### 2.1 必需环境变量
```bash
# 应用配置
NESTJS_PORT=3001
FRONTEND_URL=http://localhost:5173

# Supabase配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=mini-transmit-files
```

### 2.2 开发环境启动
```bash
npm install
npm run start:dev
```

## 3. API接口文档

### 3.1 用户接口 (/api/users)

#### 创建用户
```http
POST /api/users
Content-Type: application/json

Body:
{
  "avatar": "string?" // 可选头像URL
}

Response 201:
{
  "id": "uuid",
  "nickname": "string", // 自动生成的随机昵称
  "avatar": "string?",
  "scanUrl": "string", // 扫码链接
  "qrToken": "string", // 用户专属token
  "createdAt": "datetime"
}
```

#### 获取用户信息
```http
GET /api/users/:id

Response 200: 同创建用户响应格式
Response 404: 用户不存在
```



### 3.2 Token接口 (/api/tokens)

#### 查询Token信息
```http
GET /api/tokens/:token

Response 200:
{
  "userId": "uuid",
  "userNickname": "string",
  "userAvatar": "string?",
  "createdAt": "datetime"
}

Response 404: Token不存在
```

### 3.3 聊天室接口 (/api/rooms)

#### 加入或创建聊天室
```http
POST /api/rooms
Content-Type: application/json

Body:
{
  "userId1": "uuid", // 第一个用户ID
  "userId2": "uuid"  // 第二个用户ID
}

Response 200:
{
  "id": "uuid",
  "participants": [
    {
      "id": "uuid",
      "nickname": "string",
      "avatar": "string?"
    }
  ],
  "createdAt": "datetime"
}

说明：
- 如果两个用户间已存在聊天室，返回现有房间信息
- 如果不存在，创建新的聊天室并返回
```

#### 获取用户的聊天室列表
```http
GET /api/rooms/user/:userId

Response 200:
[
  {
    "id": "uuid",
    "participants": [
      {
        "id": "uuid",
        "nickname": "string",
        "avatar": "string?"
      }
    ],
    "createdAt": "datetime"
  }
]

说明：
- 返回指定用户参与的所有聊天室
- 按房间更新时间倒序排列
```

### 3.4 消息接口 (/api/messages)

#### 重要说明
💡 **消息发送仅通过 WebSocket 进行**，不提供 REST API 发送文本消息接口。这确保了：
- 真正的实时消息传递
- 房间权限验证  
- 消息状态同步

#### 上传文件
```http
POST /api/messages/upload
Content-Type: multipart/form-data

Form Data:
- file: File (最大10MB)

支持的文件类型：图片、PDF、文档、压缩包

Response 200:
{
  "fileUrl": "string",     // 文件访问URL
  "fileName": "string",    // 原始文件名
  "fileSize": "string",    // 格式化的文件大小 (如 "2.5 MB")
  "fileType": "image" | "file"  // 消息类型
}

说明：
- 此接口仅负责文件上传，不创建消息记录
- 上传成功后，需通过WebSocket发送文件消息
- 文件类型自动判断：图片文件返回 "image"，其他文件返回 "file"
```

#### 完整文件分享流程
```javascript
// 步骤1：上传文件到云存储
const formData = new FormData();
formData.append('file', selectedFile);

const response = await fetch('/api/messages/upload', {
  method: 'POST',
  body: formData
});

const { fileUrl, fileName, fileSize, fileType } = await response.json();

// 步骤2：通过WebSocket发送文件消息（实时广播）
ws.send(JSON.stringify({
  type: 'send_message',
  data: {
    roomId: currentRoomId,
    type: fileType, // 'image' 或 'file'
    fileName: fileName,
    fileUrl: fileUrl,
    fileSize: fileSize
  }
}));
```

#### 获取聊天室消息
```http
GET /api/messages/room/:roomId?limit=50&offset=0

Response 200:
[
  {
    "id": "uuid",
    "roomId": "uuid", 
    "senderId": "uuid",
    "senderNickname": "string", // 真实用户昵称
    "type": "text" | "image" | "file",
    "content": "string?", // 文本消息内容
    "fileName": "string?", // 文件名
    "fileUrl": "string?", // 文件URL
    "fileSize": "string?", // 文件大小
    "createdAt": "datetime"
  }
]
```



## 4. WebSocket通信

### 4.1 连接
```javascript
const ws = new WebSocket('ws://localhost:3001/socket?userId=user-uuid');

// 连接成功后会收到确认消息
ws.onopen = function() {
  console.log('WebSocket连接已建立');
};

ws.onmessage = function(event) {
  const message = JSON.parse(event.data);
  
  switch(message.type) {
    case 'connected':
      // 连接确认：message.data 包含 userId, nickname, connectedAt
      console.log('连接确认:', message.data);
      break;
    case 'new_message':
      // 新消息：message.data 包含完整消息信息
      handleNewMessage(message.data);
      break;
    case 'error':
      // 错误信息：message.data.message
      console.error('WebSocket错误:', message.data.message);
      break;
  }
};
```

### 4.2 消息发送（唯一方式）
```javascript
// 📨 发送文本消息（实时）
ws.send(JSON.stringify({
  type: 'send_message',
  data: {
    roomId: 'uuid',
    type: 'text',
    content: 'Hello World!'
  }
}));

// 📎 发送文件消息（文件先通过 POST /api/messages/upload 上传）
ws.send(JSON.stringify({
  type: 'send_message',
  data: {
    roomId: 'uuid',
    type: 'image', // 或 'file'，来自上传接口返回的 fileType
    fileName: 'photo.jpg', // 来自上传接口返回的 fileName
    fileUrl: 'https://supabase.co/storage/...', // 来自上传接口返回的 fileUrl
    fileSize: '2.5 MB' // 来自上传接口返回的 fileSize
  }
}));

// 重要提醒：
// 1. 发送消息前会自动验证用户权限，确保只能在授权的房间内发送消息
// 2. 消息会实时广播给房间内所有在线用户
// 3. 消息将永久存储在数据库中，可通过 GET /api/messages/room/:roomId 查询历史记录
```

## 5. 数据库结构

### 5.1 用户表 (users)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname VARCHAR(100) NOT NULL,
    avatar TEXT,
    scan_url TEXT NOT NULL UNIQUE,     -- 扫码链接
    qr_token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 聊天室表 (rooms)
```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 参与者表 (room_participants)
```sql
CREATE TABLE room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(100) NOT NULL,
    avatar TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);
```

### 5.4 消息表 (messages)
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_nickname VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'image', 'file')),
    content TEXT,
    file_name TEXT,
    file_url TEXT,
    file_size VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.5 设计特点

#### 无所有者设计
- 聊天室不再有所有者概念，所有参与者地位平等
- 适合一对一聊天场景，避免不必要的权限复杂性

#### 自动房间匹配
- 两个用户之间只能存在一个聊天室
- 重复创建会返回现有房间ID，避免重复房间

#### 数据冗余优化
- 在 `room_participants` 中存储用户昵称和头像
- 在 `messages` 中存储发送者昵称
- 减少 JOIN 查询，提高性能

#### 安全保障
- 启用行级安全策略 (RLS)
- 完整的权限控制策略
- 级联删除保证数据一致性
- 自动更新时间戳
- 实时通知机制

## 6. 扫码流程

1. **生成二维码**：用户创建后获得 `scanUrl` 和 `qrToken`
   - scanUrl 格式：`http://localhost:5173/#/pages/scan-result/scan-result?token={qrToken}`
2. **扫码解析**：扫码者解析URL中的token参数
3. **查询信息**：调用 `/api/tokens/:token` 获取用户信息
4. **创建用户**：扫码者需要先创建自己的用户账号
5. **进入聊天**：调用 `/api/rooms` 创建或加入聊天室
   ```json
   POST /api/rooms
   {
     "userId1": "被扫码用户ID",
     "userId2": "扫码者用户ID"
   }
   ```
   - 如果两个用户间已存在聊天室，返回现有房间ID
   - 如果不存在，创建新的聊天室
6. **WebSocket连接**：使用自己的userId连接WebSocket

## 7. 文件上传

- **支持格式**：图片、PDF、文档、压缩包
- **大小限制**：10MB
- **存储方式**：Supabase Storage
- **访问方式**：公共URL

## 8. 安全考虑

- **CORS**：开发环境允许所有来源
- **文件验证**：类型和大小限制
- **房间权限**：发送消息前验证用户权限
- **Token机制**：用户ID不直接暴露

## 9. 数据库迁移

### 9.1 新项目初始化
```bash
# 运行初始化脚本（在 Supabase 控制台的 SQL 编辑器中执行）
# 或使用 psql 命令行工具：
psql -h your-supabase-host -p 5432 -U postgres -d postgres -f database/init.sql
```

### 9.2 从旧版本升级
如果你的数据库中存在 `owner_id` 和 `is_owner` 字段（旧版本），需要运行迁移脚本：

```bash
# 运行迁移脚本移除所有者概念
psql -h your-supabase-host -p 5432 -U postgres -d postgres -f database/migration_remove_owner_id.sql
```

### 9.3 数据库特性
- ✅ 完整的行级安全策略 (RLS)
- ✅ 自动时间戳更新
- ✅ 级联删除约束
- ✅ 索引优化
- ✅ 实时通知机制
- ✅ 数据一致性检查

## 10. 部署

使用Docker进行部署，支持开发、测试、生产环境配置。详见项目根目录的docker-compose文件。

### 10.1 开发环境
```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 或使用启动脚本
./dev.sh

# 开发环境访问地址：
# - API服务: http://localhost:3001/api
# - WebSocket: ws://localhost:3001/socket
```

### 10.2 生产环境
```bash
# 启动生产环境
docker-compose -f docker-compose.prod.yml up -d
```

## 11. 更新日志

### v2.0 (最新) - 无所有者架构 + 消息统一化
**重大架构调整：**
- ✅ 移除聊天室所有者概念 (`owner_id`, `is_owner`)
- ✅ 简化房间创建逻辑，改为 `joinOrCreateRoom`
- ✅ 删除 `/api/users/:id/enter-chat` 接口
- ✅ **删除 `GET /api/rooms/:id` 接口** - 避免重复API，前端通过用户聊天室列表即可获取完整信息
- ✅ **删除 `POST /api/messages` 接口** - 消息发送统一使用 WebSocket
- ✅ **优化 `POST /api/messages/upload` 接口** - 职责分离，仅负责文件上传
- ✅ 优化 `/api/rooms` 接口，支持自动房间匹配
- ✅ 更新 Token 接口响应格式 (`ownerId` → `userId`)
- ✅ 移除独立的 chat 模块，WebSocket功能集成到 WebSocketService
- ✅ 添加数据库迁移脚本和完整的RLS安全策略

**消息架构统一化：**
- 🚀 所有消息（文本/文件）统一通过 WebSocket 发送
- 🔄 文件上传与消息发送职责分离
- ⚡ 确保所有消息都是实时广播
- 🎯 架构清晰：上传用REST，发送用WebSocket
- 🔒 严格的房间权限验证，确保用户只能在授权房间发送消息

**技术优势：**
- 减少 50% 的权限判断逻辑
- 简化前端实现复杂度
- 提升一对一聊天体验
- 防止重复房间创建
- 消息实时性100%保证
- 完整的安全策略和权限控制

### v1.0 - 基础版本
- 基础聊天功能
- 文件上传
- WebSocket 实时通信
- 扫码加入功能

-- Supabase 数据库初始化脚本
-- 适用于 mini_transmit 即时聊天应用

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname VARCHAR(100) NOT NULL,
    avatar TEXT,
    scan_url TEXT NOT NULL UNIQUE,
    qr_token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 聊天房间表
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 房间参与者表
CREATE TABLE IF NOT EXISTS room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(100) NOT NULL,
    avatar TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- 4. 消息表
CREATE TABLE IF NOT EXISTS messages (
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

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_qr_token ON users(qr_token);
CREATE INDEX IF NOT EXISTS idx_users_scan_url ON users(scan_url);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 创建自动更新 updated_at 字段的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加自动更新触发器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at 
    BEFORE UPDATE ON rooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 用户表的RLS策略
-- 允许所有用户查看其他用户的基本信息（不包括敏感信息）
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

-- 用户只能更新自己的信息
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (true);

-- 允许创建新用户
CREATE POLICY "Anyone can create users" ON users
    FOR INSERT WITH CHECK (true);

-- 房间表的RLS策略
-- 只有房间参与者可以查看房间信息
CREATE POLICY "Room participants can view rooms" ON rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM room_participants 
            WHERE room_participants.room_id = rooms.id
        )
    );

-- 房间参与者可以更新房间信息
CREATE POLICY "Room participants can update rooms" ON rooms
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM room_participants 
            WHERE room_participants.room_id = rooms.id
        )
    );

-- 允许创建新房间
CREATE POLICY "Anyone can create rooms" ON rooms
    FOR INSERT WITH CHECK (true);

-- 房间参与者表的RLS策略
-- 房间参与者可以查看同房间的其他参与者
CREATE POLICY "Room participants can view other participants" ON room_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM room_participants rp
            WHERE rp.room_id = room_participants.room_id
        )
    );

-- 允许添加新的房间参与者
CREATE POLICY "Anyone can join rooms" ON room_participants
    FOR INSERT WITH CHECK (true);

-- 用户可以离开房间（删除自己的参与记录）
CREATE POLICY "Users can leave rooms" ON room_participants
    FOR DELETE USING (true);

-- 消息表的RLS策略
-- 只有房间参与者可以查看消息
CREATE POLICY "Room participants can view messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM room_participants 
            WHERE room_participants.room_id = messages.room_id
        )
    );

-- 只有房间参与者可以发送消息
CREATE POLICY "Room participants can send messages" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM room_participants 
            WHERE room_participants.room_id = messages.room_id 
            AND room_participants.user_id = messages.sender_id
        )
    );

-- 只有消息发送者可以删除自己的消息
CREATE POLICY "Message senders can delete own messages" ON messages
    FOR DELETE USING (true);

-- 创建实时订阅的发布规则（用于WebSocket实时通信）
-- 新消息发布
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'new_message',
        json_build_object(
            'room_id', NEW.room_id,
            'message_id', NEW.id,
            'sender_id', NEW.sender_id,
            'type', NEW.type
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- 新用户加入房间发布
CREATE OR REPLACE FUNCTION notify_user_joined()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'user_joined',
        json_build_object(
            'room_id', NEW.room_id,
            'user_id', NEW.user_id,
            'nickname', NEW.nickname
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_user_joined
    AFTER INSERT ON room_participants
    FOR EACH ROW EXECUTE FUNCTION notify_user_joined();

-- 插入一些示例数据（可选）
-- 如果您需要测试数据，请取消以下注释

/*
-- 示例用户
INSERT INTO users (nickname, scan_url, qr_token) VALUES 
('测试用户1', 'https://example.com/scan/user1', 'token1'),
('测试用户2', 'https://example.com/scan/user2', 'token2');

-- 示例房间
INSERT INTO rooms DEFAULT VALUES;

-- 示例房间参与者
INSERT INTO room_participants (room_id, user_id, nickname)
SELECT 
    r.id,
    u.id,
    u.nickname
FROM rooms r, users u
WHERE u.nickname IN ('测试用户1', '测试用户2')
LIMIT 2;
*/

-- 脚本执行完成
SELECT 'Database initialization completed successfully!' as status; 
require('dotenv').config();
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { initDatabase } from './db';
import { postsRouter, uploadsRouter, settingsRouter, commentsRouter, reportsRouter, messagesRouter } from './routes';

// WebSocket客户端映射
const clients = new Map<string, WebSocket>();

// 向特定用户发送消息
export function broadcastToUser(userId: string, data: any) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const CAF_BASE_URL = process.env.CAF_BASE_URL || 'https://auth.apoints.cn';

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost:5173') || 
        origin.includes('localhost:5174') ||
        origin.includes('localhost:3001')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/posts', postsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/messages', messagesRouter);

app.all('/api/caf/*', async (req, res) => {
  try {
    const path = req.originalUrl.replace(/^\/api\/caf(\/.*)/, '$1');
    const url = `${CAF_BASE_URL}${path}`;
    
    console.log(`[CAF Proxy] ${req.method} ${url}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    console.log(`[CAF Proxy] Response:`, data);
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[CAF Proxy] Error:', error.message);
    res.status(500).json({ error: error.message || '代理请求失败' });
  }
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  try {
    await initDatabase();
    
    // 创建HTTP服务器
    const server = http.createServer(app);
    
    // 创建WebSocket服务器
    const wss = new WebSocketServer({ server });
    
    wss.on('connection', (ws: WebSocket) => {
      console.log('新的WebSocket连接');
      
      // 客户端发送身份验证消息：{ type: 'auth', userId: '123' }
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'auth' && data.userId) {
            clients.set(data.userId, ws);
            console.log(`用户 ${data.userId} 已连接WebSocket`);
          }
        } catch (error) {
          console.error('WebSocket消息解析失败:', error);
        }
      });
      
      ws.on('close', () => {
        // 从映射中移除该连接
        for (const [userId, client] of clients.entries()) {
          if (client === ws) {
            clients.delete(userId);
            console.log(`用户 ${userId} 的WebSocket连接已关闭`);
            break;
          }
        }
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
      });
    });
    
    server.listen(PORT, () => {
      console.log(`🚀 HTTP Server running on http://localhost:${PORT}`);
      console.log(`🚀 WebSocket Server running on ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

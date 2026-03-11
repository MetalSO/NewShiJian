import { Router } from 'express';
import { query, getClient } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 获取用户的消息列表
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, unread_only } = req.query;
    
    let sql = `
      SELECT m.*, 
             p.title as post_title,
             c.content as comment_preview
      FROM messages m
      LEFT JOIN posts p ON m.target_type = 'post' AND m.target_id = p.id
      LEFT JOIN comments c ON m.target_type = 'comment' AND m.target_id = c.id
      WHERE m.receiver_id = $1
    `;
    const params: any[] = [userId];
    
    if (type) {
      sql += ' AND m.type = $2';
      params.push(type);
    }
    
    if (unread_only === 'true') {
      sql += ' AND m.is_read = false';
    }
    
    sql += ' ORDER BY m.created_at DESC';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('获取消息列表失败:', error);
    res.status(500).json({ error: '获取消息列表失败' });
  }
});

// 获取未读消息数量
router.get('/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await query(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false',
      [userId]
    );
    
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('获取未读消息数量失败:', error);
    res.status(500).json({ error: '获取未读消息数量失败' });
  }
});

// 标记消息为已读
router.post('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const result = await query(
      'UPDATE messages SET is_read = true WHERE id = $1 RETURNING *',
      [messageId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '消息不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('标记消息为已读失败:', error);
    res.status(500).json({ error: '标记消息为已读失败' });
  }
});

// 标记所有消息为已读
router.post('/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await query(
      'UPDATE messages SET is_read = true WHERE receiver_id = $1',
      [userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('标记所有消息为已读失败:', error);
    res.status(500).json({ error: '标记所有消息为已读失败' });
  }
});

// 删除消息
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const result = await query(
      'DELETE FROM messages WHERE id = $1 RETURNING id',
      [messageId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '消息不存在' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除消息失败:', error);
    res.status(500).json({ error: '删除消息失败' });
  }
});

// 发送消息（内部使用，也可对外提供）
router.post('/', async (req, res) => {
  const client = await getClient();
  try {
    const {
      sender_id,
      sender_username,
      receiver_id,
      receiver_username,
      type,
      target_type,
      target_id,
      content,
    } = req.body;
    
    if (!sender_id || !sender_username || !receiver_id || !receiver_username || !type || !content) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    
    // 验证type和target_type
    const validTypes = ['reply', 'like', 'system', 'mention'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: '无效的消息类型' });
    }
    
    if (target_type && !['post', 'comment'].includes(target_type)) {
      return res.status(400).json({ error: '无效的目标类型' });
    }
    
    const id = uuidv4();
    const result = await client.query(
      `INSERT INTO messages (id, sender_id, sender_username, receiver_id, receiver_username, type, target_type, target_id, content, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, sender_id, sender_username, receiver_id, receiver_username, type, target_type || null, target_id || null, content]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({ error: '发送消息失败' });
  } finally {
    client.release();
  }
});

export default router;
import { Router, Request, Response } from 'express';
import { query, getClient } from '../db';

const router = Router();

interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_username: string;
  created_at: string;
  updated_at: string;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM posts ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('获取帖子列表失败:', error);
    res.status(500).json({ error: '获取帖子列表失败' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '帖子不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('获取帖子失败:', error);
    res.status(500).json({ error: '获取帖子失败' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, title, content, author_id, author_username, author_avatar, cover_image } = req.body;
    
    if (!id || !title || !content || !author_id || !author_username) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const result = await query(
      `INSERT INTO posts (id, title, content, author_id, author_username, author_avatar, cover_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, title, content, author_id, author_username, author_avatar || null, cover_image || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('创建帖子失败:', error);
    res.status(500).json({ error: '创建帖子失败' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, cover_image } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    
    const result = await query(
      `UPDATE posts 
       SET title = $1, content = $2, cover_image = COALESCE($4, cover_image), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [title, content, id, cover_image || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '帖子不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新帖子失败:', error);
    res.status(500).json({ error: '更新帖子失败' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM posts WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '帖子不存在' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除帖子失败:', error);
    res.status(500).json({ error: '删除帖子失败' });
  }
});

// 点赞帖子
router.post('/:id/like', async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { user_id, username } = req.body;
    
    if (!user_id || !username) {
      return res.status(400).json({ error: '用户信息缺失' });
    }
    
    await client.query('BEGIN');
    
    // 检查帖子是否存在
    const postCheck = await client.query('SELECT id FROM posts WHERE id = $1', [id]);
    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '帖子不存在' });
    }
    
    // 检查用户是否已经点赞
    const likeCheck = await client.query(
      'SELECT id FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [user_id, 'post', id]
    );
    
    if (likeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '您已经点过赞了' });
    }
    
    // 插入点赞记录
    const likeId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    await client.query(
      'INSERT INTO likes (id, user_id, target_type, target_id, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
      [likeId, user_id, 'post', id]
    );
    
    // 更新帖子点赞数
    const result = await client.query(
      `UPDATE posts 
       SET likes = COALESCE(likes, 0) + 1
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('点赞帖子失败:', error);
    res.status(500).json({ error: '点赞帖子失败' });
  } finally {
    client.release();
  }
});

// 取消点赞帖子
router.post('/:id/unlike', async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { user_id, username } = req.body;
    
    if (!user_id || !username) {
      return res.status(400).json({ error: '用户信息缺失' });
    }
    
    await client.query('BEGIN');
    
    // 检查帖子是否存在
    const postCheck = await client.query('SELECT id FROM posts WHERE id = $1', [id]);
    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '帖子不存在' });
    }
    
    // 检查用户是否已经点赞
    const likeCheck = await client.query(
      'SELECT id FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [user_id, 'post', id]
    );
    
    if (likeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '您还没有点赞过' });
    }
    
    // 删除点赞记录
    await client.query(
      'DELETE FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [user_id, 'post', id]
    );
    
    // 更新帖子点赞数
    const result = await client.query(
      `UPDATE posts 
       SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('取消点赞帖子失败:', error);
    res.status(500).json({ error: '取消点赞帖子失败' });
  } finally {
    client.release();
  }
});

// 检查用户是否已点赞帖子
router.get('/:id/like-status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }
    
    // 检查帖子是否存在
    const postCheck = await query('SELECT id FROM posts WHERE id = $1', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: '帖子不存在' });
    }
    
    // 检查用户是否已经点赞
    const likeCheck = await query(
      'SELECT id FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [user_id as string, 'post', id]
    );
    
    res.json({ liked: likeCheck.rows.length > 0 });
  } catch (error) {
    console.error('检查点赞状态失败:', error);
    res.status(500).json({ error: '检查点赞状态失败' });
  }
});

export default router;

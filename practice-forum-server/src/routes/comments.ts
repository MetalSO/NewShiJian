import { Router } from 'express';
import { query, getClient } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 获取帖子的所有评论
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const result = await query(
      'SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at DESC',
      [postId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ error: '获取评论失败' });
  }
});

// 创建新评论
router.post('/:postId', async (req, res) => {
  const client = await getClient();
  try {
    const { postId } = req.params;
    const { content, author_id, author_username, author_avatar, parent_id } = req.body;
    
    if (!content || !author_id || !author_username) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    
    await client.query('BEGIN');
    
    // 如果提供了parent_id，验证父评论存在且属于同一个帖子
    let parentCommentAuthorId: string | null = null;
    let parentCommentAuthorUsername: string | null = null;
    
    if (parent_id) {
      const parentCheck = await client.query(
        'SELECT author_id, author_username, post_id FROM comments WHERE id = $1',
        [parent_id]
      );
      
      if (parentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '父评论不存在' });
      }
      
      if (parentCheck.rows[0].post_id !== postId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '父评论不属于当前帖子' });
      }
      
      parentCommentAuthorId = parentCheck.rows[0].author_id;
      parentCommentAuthorUsername = parentCheck.rows[0].author_username;
    }
    
    // 获取帖子标题（用于消息）
    const postResult = await client.query('SELECT title FROM posts WHERE id = $1', [postId]);
    const postTitle = postResult.rows.length > 0 ? postResult.rows[0].title : '未知帖子';
    
    const id = uuidv4();
    const result = await client.query(
      `INSERT INTO comments (id, post_id, content, author_id, author_username, author_avatar, parent_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, postId, content, author_id, author_username, author_avatar || null, parent_id || null]
    );
    
    // 如果是回复，发送通知给父评论作者
    if (parent_id && parentCommentAuthorId && parentCommentAuthorUsername && parentCommentAuthorId !== author_id) {
      const messageId = uuidv4();
      const messageContent = `用户 ${author_username} 在帖子《${postTitle}》中回复了您的评论：${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
      
      await client.query(
        `INSERT INTO messages (id, sender_id, sender_username, receiver_id, receiver_username, type, target_type, target_id, content, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, CURRENT_TIMESTAMP)`,
        [messageId, author_id, author_username, parentCommentAuthorId, parentCommentAuthorUsername, 'reply', 'comment', id, messageContent]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('创建评论失败:', error);
    res.status(500).json({ error: '创建评论失败' });
  } finally {
    client.release();
  }
});

// 更新评论
router.put('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, author_id } = req.body;
    
    if (!content || !author_id) {
      return res.status(400).json({ error: '内容和用户ID不能为空' });
    }
    
    // 首先检查评论是否存在以及用户是否有权限
    const checkResult = await query(
      'SELECT author_id FROM comments WHERE id = $1',
      [commentId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }
    
    const comment = checkResult.rows[0];
    if (comment.author_id !== author_id) {
      return res.status(403).json({ error: '没有权限修改此评论' });
    }
    
    const result = await query(
      `UPDATE comments 
       SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [content, commentId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新评论失败:', error);
    res.status(500).json({ error: '更新评论失败' });
  }
});

// 删除评论
router.delete('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { author_id } = req.body;
    
    if (!author_id) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }
    
    // 首先检查评论是否存在以及用户是否有权限
    const checkResult = await query(
      'SELECT author_id FROM comments WHERE id = $1',
      [commentId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }
    
    const comment = checkResult.rows[0];
    if (comment.author_id !== author_id) {
      return res.status(403).json({ error: '没有权限删除此评论' });
    }
    
    await query('DELETE FROM comments WHERE id = $1', [commentId]);
    
    res.status(204).send();
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ error: '删除评论失败' });
  }
});

// 点赞评论
router.post('/:commentId/like', async (req, res) => {
  const client = await getClient();
  try {
    const { commentId } = req.params;
    const { user_id, username } = req.body;
    
    if (!user_id || !username) {
      return res.status(400).json({ error: '用户信息缺失' });
    }
    
    await client.query('BEGIN');
    
    // 检查评论是否存在
    const commentCheck = await client.query('SELECT id FROM comments WHERE id = $1', [commentId]);
    if (commentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '评论不存在' });
    }
    
    // 检查用户是否已经点赞
    const likeCheck = await client.query(
      'SELECT id FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [user_id, 'comment', commentId]
    );
    
    if (likeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '您已经点过赞了' });
    }
    
    // 插入点赞记录
    const likeId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    await client.query(
      'INSERT INTO likes (id, user_id, target_type, target_id, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
      [likeId, user_id, 'comment', commentId]
    );
    
    // 更新评论点赞数
    const result = await client.query(
      `UPDATE comments 
       SET likes = COALESCE(likes, 0) + 1
       WHERE id = $1
       RETURNING *`,
      [commentId]
    );
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('点赞评论失败:', error);
    res.status(500).json({ error: '点赞评论失败' });
  } finally {
    client.release();
  }
});

// 取消点赞评论
router.post('/:commentId/unlike', async (req, res) => {
  const client = await getClient();
  try {
    const { commentId } = req.params;
    const { user_id, username } = req.body;
    
    if (!user_id || !username) {
      return res.status(400).json({ error: '用户信息缺失' });
    }
    
    await client.query('BEGIN');
    
    // 检查评论是否存在
    const commentCheck = await client.query('SELECT id FROM comments WHERE id = $1', [commentId]);
    if (commentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '评论不存在' });
    }
    
    // 检查用户是否已经点赞
    const likeCheck = await client.query(
      'SELECT id FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [user_id, 'comment', commentId]
    );
    
    if (likeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '您还没有点赞过' });
    }
    
    // 删除点赞记录
    await client.query(
      'DELETE FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [user_id, 'comment', commentId]
    );
    
    // 更新评论点赞数
    const result = await client.query(
      `UPDATE comments 
       SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
       WHERE id = $1
       RETURNING *`,
      [commentId]
    );
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('取消点赞评论失败:', error);
    res.status(500).json({ error: '取消点赞评论失败' });
  } finally {
    client.release();
  }
});

// 检查用户是否已点赞评论
router.get('/:commentId/like-status', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }
    
    // 检查评论是否存在
    const commentCheck = await query('SELECT id FROM comments WHERE id = $1', [commentId]);
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }
    
    // 检查用户是否已经点赞
    const likeCheck = await query(
      'SELECT id FROM likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [user_id as string, 'comment', commentId]
    );
    
    res.json({ liked: likeCheck.rows.length > 0 });
  } catch (error) {
    console.error('检查点赞状态失败:', error);
    res.status(500).json({ error: '检查点赞状态失败' });
  }
});

export default router;
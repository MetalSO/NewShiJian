import { Router } from 'express';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 创建举报
router.post('/', async (req, res) => {
  try {
    const { reporter_id, reporter_username, target_type, target_id, reason } = req.body;
    
    if (!reporter_id || !reporter_username || !target_type || !target_id || !reason) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    
    // 验证target_type有效
    if (!['post', 'comment'].includes(target_type)) {
      return res.status(400).json({ error: '无效的目标类型，必须是post或comment' });
    }
    
    // 验证目标是否存在
    const targetTable = target_type === 'post' ? 'posts' : 'comments';
    const targetCheck = await query(
      `SELECT id FROM ${targetTable} WHERE id = $1`,
      [target_id]
    );
    
    if (targetCheck.rows.length === 0) {
      return res.status(404).json({ error: `${target_type === 'post' ? '帖子' : '评论'}不存在` });
    }
    
    const id = uuidv4();
    const result = await query(
      `INSERT INTO reports (id, reporter_id, reporter_username, target_type, target_id, reason, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, reporter_id, reporter_username, target_type, target_id, reason]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('创建举报失败:', error);
    res.status(500).json({ error: '创建举报失败' });
  }
});

// 获取举报列表（管理员使用）
router.get('/', async (req, res) => {
  try {
    const { status, target_type } = req.query;
    
    let sql = 'SELECT * FROM reports';
    const params: any[] = [];
    let whereClauses: string[] = [];
    
    if (status) {
      whereClauses.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (target_type) {
      whereClauses.push(`target_type = $${params.length + 1}`);
      params.push(target_type);
    }
    
    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('获取举报列表失败:', error);
    res.status(500).json({ error: '获取举报列表失败' });
  }
});

// 更新举报状态（管理员使用）
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }
    
    const result = await query(
      `UPDATE reports 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '举报不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新举报状态失败:', error);
    res.status(500).json({ error: '更新举报状态失败' });
  }
});

// 删除举报（管理员使用）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM reports WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '举报不存在' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除举报失败:', error);
    res.status(500).json({ error: '删除举报失败' });
  }
});

export default router;
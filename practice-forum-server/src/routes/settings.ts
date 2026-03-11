import { Router, Request, Response } from 'express';
import { query, ensureUserSettings } from '../db';

const router = Router();

interface UserSettings {
  id: number;
  user_id: string;
  bio: string;
  email_on_reply: boolean;
  dm_on_like: boolean;
  weekly_digest: boolean;
  theme_mode: string;
  theme_color: string;
  density: string;
  language: string;
  timezone: string;
}

interface Theme {
  id: number;
  name: string;
  color: string;
  is_default: boolean;
}

const settingsToResponse = (row: UserSettings) => ({
  bio: row.bio,
  emailOnReply: row.email_on_reply,
  dmOnLike: row.dm_on_like,
  weeklyDigest: row.weekly_digest,
  themeMode: row.theme_mode,
  themeColor: row.theme_color,
  density: row.density,
  language: row.language,
  timezone: row.timezone,
});

router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    await ensureUserSettings(userId);
    
    const result = await query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.json({
        bio: '',
        emailOnReply: true,
        dmOnLike: true,
        weeklyDigest: false,
        themeMode: 'system',
        themeColor: 'blue',
        density: 'comfortable',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
      });
    }
    
    res.json(settingsToResponse(result.rows[0]));
  } catch (error) {
    console.error('获取用户设置失败:', error);
    res.status(500).json({ error: '获取用户设置失败' });
  }
});

router.post('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const {
      bio,
      emailOnReply,
      dmOnLike,
      weeklyDigest,
      themeMode,
      themeColor,
      density,
      language,
      timezone,
    } = req.body;
    
    await ensureUserSettings(userId);
    
    const result = await query(
      `UPDATE user_settings 
       SET bio = COALESCE($1, bio),
           email_on_reply = COALESCE($2, email_on_reply),
           dm_on_like = COALESCE($3, dm_on_like),
           weekly_digest = COALESCE($4, weekly_digest),
           theme_mode = COALESCE($5, theme_mode),
           theme_color = COALESCE($6, theme_color),
           density = COALESCE($7, density),
           language = COALESCE($8, language),
           timezone = COALESCE($9, timezone),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $10
       RETURNING *`,
      [bio, emailOnReply, dmOnLike, weeklyDigest, themeMode, themeColor, density, language, timezone, userId]
    );
    
    res.json(settingsToResponse(result.rows[0]));
  } catch (error) {
    console.error('保存用户设置失败:', error);
    res.status(500).json({ error: '保存用户设置失败' });
  }
});

router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    await ensureUserSettings(userId);
    
    await query(
      `UPDATE user_settings 
       SET bio = '',
           email_on_reply = true,
           dm_on_like = true,
           weekly_digest = false,
           theme_mode = 'system',
           theme_color = 'blue',
           density = 'comfortable',
           language = 'zh-CN',
           timezone = 'Asia/Shanghai',
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('重置用户设置失败:', error);
    res.status(500).json({ error: '重置用户设置失败' });
  }
});

router.get('/themes/list', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT DISTINCT ON (color) id, name, color, is_default, created_at FROM themes ORDER BY color, id'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('获取主题列表失败:', error);
    res.status(500).json({ error: '获取主题列表失败' });
  }
});

export default router;

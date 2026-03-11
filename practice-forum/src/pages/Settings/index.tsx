import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Switch, Select, message, Alert, Space, Slider } from 'antd';
import { SettingOutlined, BellOutlined, UserOutlined, SkinOutlined, GlobalOutlined, SaveOutlined, MoonOutlined, SunOutlined, DesktopOutlined, FontSizeOutlined, LineHeightOutlined, FontColorsOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme, colorMap, type ThemeColor } from '../../context/ThemeContext';
import { useReadingPreferences, type FontFamily, type FontSize, type LineHeight } from '../../context/ReadingPreferencesContext';
import { getUserSettings, saveUserSettings, resetUserSettings, getThemeList } from '../../services/api';
import type { UserSettings } from '../../services/api';
import './index.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const defaultSettings: UserSettings = {
  bio: '',
  emailOnReply: true,
  dmOnLike: true,
  weeklyDigest: false,
  themeMode: 'system',
  themeColor: 'blue',
  density: 'comfortable',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
};

const Settings: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { mode, resolvedMode, color, setMode, setColor } = useTheme();
  const { preferences, setFontFamily, setFontSize, setLineHeight, setMaxWidth, fontSizeMap, lineHeightMap, fontFamilyMap } = useReadingPreferences();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themes, setThemes] = useState<{ id: number; name: string; color: string }[]>([]);
  const [loadedSettings, setLoadedSettings] = useState<UserSettings | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settings, themeList] = await Promise.all([
        user?.id ? getUserSettings(user.id) : Promise.resolve(defaultSettings),
        getThemeList().catch(() => [
          { id: 1, name: '蓝色', color: 'blue' },
          { id: 2, name: '绿色', color: 'green' },
          { id: 3, name: '紫色', color: 'purple' },
          { id: 4, name: '红色', color: 'red' },
          { id: 5, name: '橙色', color: 'orange' },
          { id: 6, name: '青色', color: 'cyan' },
        ]),
      ]);
      setThemes(themeList);
      setLoadedSettings(settings);
      setMode(settings.themeMode);
      setColor(settings.themeColor as ThemeColor);
    } catch (error) {
      setLoadedSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (changedValues: Partial<UserSettings>) => {
    console.log('Form values changed:', changedValues);
    if (changedValues.themeMode !== undefined) {
      console.log('Setting theme mode to:', changedValues.themeMode);
      setMode(changedValues.themeMode);
    }
    if (changedValues.themeColor !== undefined) {
      console.log('Setting theme color to:', changedValues.themeColor);
      console.log('Available colors:', Object.keys(colorMap));
      if (Object.keys(colorMap).includes(changedValues.themeColor)) {
        setColor(changedValues.themeColor as ThemeColor);
      } else {
        console.warn('Invalid theme color:', changedValues.themeColor);
      }
    }
  };

  const handleSave = async (values: UserSettings) => {
    try {
      setSaving(true);
      if (user?.id) {
        await saveUserSettings(user.id, values);
        setMode(values.themeMode);
        setColor(values.themeColor as ThemeColor);
        message.success('设置已保存');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      if (user?.id) {
        await resetUserSettings(user.id);
        form.setFieldsValue({
          ...defaultSettings,
          themeMode: mode,
          themeColor: color,
        });
        message.success('已重置为默认设置');
      }
    } catch (error) {
      message.error('重置失败');
    }
  };

  const themeIcons = {
    light: <SunOutlined />,
    dark: <MoonOutlined />,
    system: <DesktopOutlined />,
  };

  const themeModeLabels = {
    light: '浅色模式',
    dark: '深色模式',
    system: '跟随系统',
  };

  const colorLabels: Record<string, string> = {
    blue: '蓝色',
    green: '绿色',
    purple: '紫色',
    red: '红色',
    orange: '橙色',
    cyan: '青色',
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="settings-page">
      <Title level={2}>
        <SettingOutlined /> 设置
      </Title>

      <div className="settings-content">
        <Card
          title={
            <Space>
              <SkinOutlined />
              <span>主题设置</span>
            </Space>
          }
          className="settings-card"
          loading={loading}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            onValuesChange={handleThemeChange}
            initialValues={loadedSettings ? { ...defaultSettings, ...loadedSettings } : { ...defaultSettings, themeMode: mode, themeColor: color }}
          >
            <Form.Item
              name="themeMode"
              label="显示模式"
              tooltip="选择浅色、深色或跟随系统设置"
            >
              <Select
                style={{ width: 200 }}
                options={[
                  { value: 'light', label: <span><SunOutlined /> 浅色模式</span> },
                  { value: 'dark', label: <span><MoonOutlined /> 深色模式</span> },
                  { value: 'system', label: <span><DesktopOutlined /> 跟随系统</span> },
                ]}
              />
            </Form.Item>

            <Form.Item label="当前模式">
              <Tag color={resolvedMode === 'dark' ? 'default' : 'processing'} icon={themeIcons[mode as keyof typeof themeIcons]}>
                {themeModeLabels[mode as keyof typeof themeModeLabels]}
              </Tag>
            </Form.Item>

            <Form.Item
              name="themeColor"
              label="主题颜色"
              tooltip="选择喜欢的主题颜色"
              hidden
              style={{ display: 'none' }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="主题颜色"
              tooltip="选择喜欢的主题颜色"
            >
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  点击颜色方块选择主题颜色
                </Text>
                <div className="color-picker">
                  {themes.map((theme) => (
                    <ColorButton
                      key={theme.id}
                      color={colorMap[theme.color as keyof typeof colorMap] || '#1890ff'}
                      label={theme.name}
                      selected={form.getFieldValue('themeColor') === theme.color}
                      onClick={() => {
                        console.log('Color button clicked:', theme.color);
                        form.setFieldsValue({ themeColor: theme.color });
                        // 手动触发主题变更，确保即时生效
                        handleThemeChange({ themeColor: theme.color });
                      }}
                    />
                  ))}
                </div>
              </div>
            </Form.Item>

            <Form.Item label="当前颜色">
              <Tag color={colorMap[color] || '#1890ff'} style={{ fontWeight: 500 }}>
                {colorLabels[color] || '蓝色'}
              </Tag>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" icon={<SaveOutlined />} loading={saving} htmlType="submit">
                  保存设置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card
          title={
            <Space>
              <FontColorsOutlined />
              <span>阅读偏好</span>
            </Space>
          }
          className="settings-card"
        >
          <div className="reading-preferences">
            <div className="preference-section">
              <Text strong className="preference-label">
                <FontSizeOutlined /> 字体大小: {fontSizeMap[preferences.fontSize]}px
              </Text>
              <Slider
                min={12}
                max={24}
                step={2}
                value={fontSizeMap[preferences.fontSize]}
                onChange={(value) => {
                  const sizeMap: Record<number, FontSize> = { 12: 'small', 14: 'small', 16: 'medium', 18: 'large', 20: 'xlarge', 22: 'xlarge', 24: 'xlarge' };
                  setFontSize(sizeMap[value] || 'medium');
                }}
                marks={{ 12: '小', 16: '中', 20: '大', 24: '特大' }}
                style={{ marginTop: 8 }}
              />
            </div>

            <div className="preference-section">
              <Text strong className="preference-label">
                <LineHeightOutlined /> 行距: {lineHeightMap[preferences.lineHeight]}
              </Text>
              <Slider
                min={1.4}
                max={2.4}
                step={0.2}
                value={lineHeightMap[preferences.lineHeight]}
                onChange={(value) => {
                  const heightMap: Record<number, LineHeight> = { 1.4: 'compact', 1.6: 'compact', 1.8: 'normal', 2.0: 'relaxed', 2.2: 'relaxed', 2.4: 'relaxed' };
                  setLineHeight(heightMap[value] || 'normal');
                }}
                marks={{ 1.4: '紧凑', 1.8: '正常', 2.4: '宽松' }}
                style={{ marginTop: 8 }}
              />
            </div>

            <div className="preference-section">
              <Text strong className="preference-label">
                <FontColorsOutlined /> 字体类型
              </Text>
              <div className="font-family-options" style={{ marginTop: 8 }}>
                {Object.entries(fontFamilyMap).map(([key, value]) => (
                  <Button
                    key={key}
                    type={preferences.fontFamily === key ? 'primary' : 'default'}
                    onClick={() => setFontFamily(key as FontFamily)}
                    style={{ fontFamily: value, marginRight: 8, marginBottom: 8 }}
                  >
                    {key === 'simsun' && '宋体'}
                    {key === 'heiti' && '黑体'}
                    {key === 'songti' && '宋体SC'}
                    {key === 'kaiti' && '楷体'}
                    {key === 'yahei' && '微软雅黑'}
                    {key === 'arial' && 'Arial'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="preference-section">
              <Text strong className="preference-label">
                页面宽度
              </Text>
              <div style={{ marginTop: 8 }}>
                <Switch
                  checked={preferences.maxWidth}
                  onChange={setMaxWidth}
                  checkedChildren="宽松"
                  unCheckedChildren="紧凑"
                />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {preferences.maxWidth ? '宽松阅读模式（适合长文章）' : '紧凑模式（适合快速浏览）'}
                </Text>
              </div>
            </div>

            <div className="preview-section" style={{ marginTop: 24 }}>
              <Text strong>预览效果</Text>
              <div
                className="preview-box"
                style={{
                  fontFamily: fontFamilyMap[preferences.fontFamily],
                  fontSize: fontSizeMap[preferences.fontSize],
                  lineHeight: lineHeightMap[preferences.lineHeight],
                  maxWidth: preferences.maxWidth ? '100%' : '600px',
                  margin: '12px auto',
                  padding: '16px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  border: '1px solid #d9d9d9',
                }}
              >
                <p style={{ margin: 0 }}>
                  这是一段示例文本，用于预览您选择的字体、字号和行距设置。
                  良好的排版可以让阅读体验更加舒适，特别是在长时间阅读时。
                </p>
                <p style={{ margin: '8px 0 0 0' }}>
                  第二段落测试行距效果。不同的行高设置会影响文本的可读性。
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title={
            <Space>
              <UserOutlined />
              <span>个人资料</span>
            </Space>
          }
          className="settings-card"
          loading={loading}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            <Form.Item label="用户名">
              <Input value={user?.username || ''} disabled prefix={<UserOutlined />} />
              <Text type="secondary" className="form-help">
                用户名由 CAF 统一管理，无法在此修改
              </Text>
            </Form.Item>

            <Form.Item
              name="bio"
              label="个人简介"
              rules={[{ max: 200, message: '个人简介最多200个字符' }]}
            >
              <TextArea rows={3} placeholder="介绍一下自己..." showCount maxLength={200} />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" icon={<SaveOutlined />} loading={saving} htmlType="submit">
                  保存修改
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card
          title={
            <Space>
              <BellOutlined />
              <span>通知设置</span>
            </Space>
          }
          className="settings-card"
          loading={loading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item name="emailOnReply" valuePropName="checked">
              <div className="setting-item">
                <Switch />
                <div className="setting-info">
                  <Text strong>当有人回复我的帖子时</Text>
                  <Text type="secondary">通过邮件通知您有人回复</Text>
                </div>
              </div>
            </Form.Item>

            <Form.Item name="dmOnLike" valuePropName="checked">
              <div className="setting-item">
                <Switch />
                <div className="setting-info">
                  <Text strong>当有人点赞我的帖子时</Text>
                  <Text type="secondary">通过站内消息通知您</Text>
                </div>
              </div>
            </Form.Item>

            <Form.Item name="weeklyDigest" valuePropName="checked">
              <div className="setting-item">
                <Switch />
                <div className="setting-info">
                  <Text strong>每周精选内容推送</Text>
                  <Text type="secondary">每周收到精选内容推荐</Text>
                </div>
              </div>
            </Form.Item>

            <Form.Item>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} htmlType="submit">
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card
          title={
            <Space>
              <GlobalOutlined />
              <span>偏好设置</span>
            </Space>
          }
          className="settings-card"
          loading={loading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item name="language" label="语言">
              <Select style={{ width: 200 }} options={[
                { value: 'zh-CN', label: '简体中文' },
                { value: 'zh-TW', label: '繁體中文' },
                { value: 'en-US', label: 'English' },
              ]} />
            </Form.Item>

            <Form.Item name="timezone" label="时区">
              <Select style={{ width: 200 }} options={[
                { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)' },
                { value: 'Asia/Tokyo', label: '东京时间 (UTC+9)' },
                { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)' },
                { value: 'America/New_York', label: '纽约时间 (UTC-5)' },
                { value: 'America/Los_Angeles', label: '洛杉矶时间 (UTC-8)' },
                { value: 'Europe/London', label: '伦敦时间 (UTC+0)' },
              ]} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} htmlType="submit">
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card className="settings-card info-card">
          <Alert
            title="CAF 统一认证"
            description={
              <div>
                <Paragraph>
                  您的账号通过 CAF (Central Authentication Facility) 统一认证系统管理。
                </Paragraph>
                <Paragraph>
                  <Text strong>关于个人资料：</Text> 用户名由 CAF 服务器管理，个人简介保存在数据库中。
                </Paragraph>
                <Paragraph>
                  <Text strong>关于主题设置：</Text> 主题设置保存在数据库中，可在不同设备间同步。
                </Paragraph>
              </div>
            }
            type="info"
            showIcon
          />
        </Card>
      </div>
    </div>
  );
};

const ColorButton: React.FC<{ color: string; label: string; selected: boolean; onClick: () => void }> = ({
  color,
  label,
  selected,
  onClick,
}) => (
  <div className={`color-button-container ${selected ? 'selected' : ''}`}>
    <button
      type="button"
      className="color-btn"
      style={{ backgroundColor: color }}
      onClick={onClick}
      title={label}
    >
      {selected && <span className="check-mark">✓</span>}
    </button>
    <div className="color-label">{label}</div>
  </div>
);

import { Tag } from 'antd';

export default Settings;

# 🚀 LLM Hub - 快速启动指南

## 功能特性

- 📋 侧边栏管理多个 LLM 模型
- 🔍 搜索模型
- ✏️ 编辑/删除模型
- 🌐 智能打开方式（自动判断 iframe vs 新窗口）
- 🔀 代理模式（绕过 iframe 限制）
- 💾 本地存储配置

---

## 打开方式说明

| 网站类型 | 打开方式 |
|---------|---------|
| 支持 iframe 的网站 | 直接在右侧 iframe 中加载 |
| 不支持 iframe 的网站 | 自动在新标签页打开 |

### 强制新窗口打开的网站：
- MiniMax (`agent.minimaxi.com`)
- 通义千问 (`www.qianwen.com`)
- ChatGPT (`chatgpt.com`)
- DeepSeek (`chat.deepseek.com`)

---

## 使用方法

### 方法一：直接打开（推荐）

```bash
# 用浏览器打开
open index.html
# 或
xdg-open index.html
```

### 方法二：使用代理服务器（可选）

对于需要绕过 iframe 限制的网站：

```bash
cd /mnt/f/workspace4ai
node proxy.js
```

然后在浏览器打开 `index.html`，点击右上角 **代理: OFF** 切换为 **代理: ON**。

### 方法三：浏览器插件（备选）

安装以下插件后可尝试在 iframe 中加载更多网站：

| 插件 | 下载 |
|------|------|
| Ignore X-Frame-Options | Chrome Web Store |
| cSpBypass | Chrome Web Store |

---

## 添加新模型

1. 点击右上角「添加模型」
2. 输入名称、URL、图标
3. 点击「添加」

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `index.html` | 主页面 |
| `app.js` | 交互逻辑（含新窗口判断） |
| `styles.css` | 样式 |
| `proxy.js` | 本地代理服务器 |
| `package.json` | 项目配置 |

---

## 注意事项

⚠️ **登录状态**：代理方案无法传递登录态，需要重新登录各平台

⚠️ **JavaScript 检测**：部分网站会检测 iframe 环境，可能需要额外处理

⚠️ **HTTPS 混合内容**：如果主页是 HTTPS，代理也需配置 HTTPS

# 🏆 Contest-Server

**Contest-Server** 是一个**极度轻量**且**响应迅捷**的实时打分与排行榜系统。

全栈均采用 TypeScript 编写，基于新一代 JavaScript 运行时 [Bun](https://bun.sh) 和高性能框架 [ElysiaJS](https://elysiajs.com) 构建，结合 MongoDB 的高速读写能力，专为黑客松、比赛评审及即时投票场景打造。

![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)
![Bun](https://img.shields.io/badge/Runtime-Bun_v1.3+-black)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## ✨ 核心特性 (Highlights)

*   **🚀 极致轻量与高性能**:
    *   **零前端框架依赖**: 摒弃 React/Vue 等重型框架，采用原生 HTML/CSS/TS，加载瞬间完成，资源占用极低。
    *   **极速后端**: 依托 Bun 运行时与 ElysiaJS，提供亚毫秒级的 API 响应速度。
    *   **MongoDB 驱动**: 利用 MongoDB 的灵活与高性能，轻松应对高并发读写。
*   **📊 丝滑的实时排行榜**:
    *   **WebSocket 同步**: 评分变化毫秒级全端同步。
    *   **物理动画引擎**: 采用 FLIP 技术与绝对定位布局，实现名次变更时的**丝滑物理交换动画**，拒绝视觉卡顿。
*   **🛠 强大的后台管理**:
    *   **批量导入**: 支持 `.txt` 文件快速导入用户与作品数据。
    *   **全局广播**: 管理员可强制所有客户端跳转至指定作品，掌控比赛节奏。
    *   **安全屏障**: 内置 API Key 鉴权与危险操作保护。
*   **💎 全栈 TypeScript**: 从后端逻辑到前端交互，统一语言栈，类型安全，维护轻松。

## ⚙️ 配置 (Configuration)

项目根目录包含配置模板。在使用前，请将 **`src/config.template`** 文件夹重命名为 **`src/config`**。

配置文件示例 (`src/config/index.ts`)：

```typescript
// MongoDB 连接地址 (推荐本地或内网数据库以获得最佳速度)
export const DatabaseConfig = {
    url: 'mongodb://localhost:27017',
}

// 可跳过密码验证
export const SkipPasswordCheck = true;

// 管理员面板密钥 (Header: x-api-key)
export const SecretKey = 'my_secret_key';

// 评分逻辑配置
export const MaxiumPoints = 100;
export const MiniumPoints = 0;
// 统计规则：去除最高/最低分的数量（0为不去除）
export const IgnoreMin = 0;
export const IgnoreMax = 0;

// Microsoft Clarity 统计 ID (可选)
export const MicrosoftClarityId = 'your_project_id'
```

## 🚀 快速开始 (Quick Start)

本项目使用 `bun` 进行包管理和运行。

### 1. 安装依赖

```bash
bun install
```

### 2. 启动服务

```bash
# 将 TS 构建成前端所需的 JS
bun run build

# 启动服务
bun run server
```

启动后，控制台将输出服务监听端口（默认为 8080）。

## 📖 功能模块 (Modules)

### 1. 实时榜单 (`/leaderboard`)
*   **大屏可视化**: 专为投影和大屏设计。
*   **自动排序**: 接收 WebSocket 推送，实时自动重排并播放交换动画。

### 2. 评委/用户端 (`/login` -> `/vote`)
*   **极简交互**: 登录后即可对作品进行打分和留言。
*   **实时反馈**: 提交成功后立即收到通知。

### 3. 管理员面板 (`/admin`)
*   **数据管理**: 查看、清空用户/作品/投票数据。
*   **流程控制**: 设置“当前默认作品”，一键同步所有评委端页面。
*   **状态监控**: 实时查看系统日志。

## 🛠 技术栈 (Tech Stack)

*   **Runtime**: [Bun](https://bun.sh) (v1.3.2)
*   **Web Framework**: [ElysiaJS](https://elysiajs.com)
*   **Database**: MongoDB
*   **Frontend**: Vanilla TypeScript + CSS3 Grid/Animations

## 🤝 贡献 (Contributing)

欢迎提交 Issue 或 Pull Request。由于本项目主打轻量化，提交代码时请尽量避免引入庞大的第三方依赖。

## 📄 许可证 (License)

MIT
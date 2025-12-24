## 介绍
面向自媒体创作者、手账爱好者、学生的轻量工具类产品，用户上传图片/输入文字描述/粘贴语音转文字内容，工具会自动提取关键元素，通过多模态大模型生成风格统一的创意拼贴画（如复古手账风、赛博朋克风、治愈插画风）

## 演示
https://github.com/user-attachments/assets/5be0a6b1-0f13-471d-88d3-0ef9a17ed1ac

## 特点
- 使用简单（仅需要输入想表达的文字和照片）
- 自动将文字和照片排版
- 每次生成排版不重复（每天有不同的 style 和心情😊）
- 支持移动端

## 快速启动

> 后端 API（NestJS）和前端 Web（Vite + React）。

### 环境要求

- Node.js **>= 20**
- pnpm **9.x**
- PostgreSQL **>= 14**

### 安装依赖（Monorepo 一次装全）

```bash
pnpm install
```

### 配置环境变量

如示例：`.env.example`。复制一份到 `.env` 并填写必需项：

```bash
cp .env.example .env
```

### 准备数据库（可选）

确保本地 PostgreSQL 已启动，并创建一个数据库（默认名为 `momentia`）。

### 启动开发环境

在仓库根目录执行：

```bash
pnpm dev
```

你也可以分别启动：

```bash
pnpm --filter @momentia/api dev
pnpm --filter @momentia/web dev
```

---

## Monorepo 架构

本仓库采用 **pnpm workspace** 的 Monorepo 结构，按「应用（apps）」与「可复用包（packages）」分层，并包含用于静态预览/演示的 `preview/`。

### 目录总览

- `apps/`：可独立运行的应用（后端 API / 前端 Web）
- `packages/`：多应用复用的共享包
- `preview/`：静态演示/预览资源（如有）

### apps/

放置**可独立运行**的应用。

#### apps/api（NestJS 后端）

- 技术栈：NestJS + Express + Sequelize + PostgreSQL
- 主要职责：
  - 提供拼贴/生成相关的 HTTP API
  - 文件上传与静态资源托管（`apps/api/uploads/`）
  - 与第三方多模态模型（OpenAI / 百度 / 豆包等 provider）交互

关键目录：
- `apps/api/src/main.ts`：应用入口（创建 Nest 应用、启动端口等）
- `apps/api/src/app.module.ts`：根模块，组合各业务模块
- `apps/api/src/common/`：通用能力
  - `http-exception.filter.ts`：统一异常处理
  - `errors/`：自定义错误类型（例如 AI 调用相关错误）
- `apps/api/src/db/`：数据库相关（Sequelize 初始化/模块化封装）
- `apps/api/src/health/`：健康检查接口（探活/部署）
- `apps/api/src/modules/`：核心业务模块
  - `collage/`：拼贴生成相关 API（controller/service/dto/types）
    - `providers/`：AI 厂商适配层（屏蔽不同厂商差异）
      - `provider.contract.ts`：provider 能力约定（接口/抽象）
      - `provider.token.ts`：Nest DI token
      - `ai-provider.config.ts`：provider 配置聚合
      - `helpers/`：生成、图像处理等辅助函数
      - `openai/`：OpenAI provider 实现
      - `baidu/`：百度 provider 实现
      - `doubao/`：豆包 provider 实现
    - `progress/`：生成过程进度事件（如 emitter）
    - `utils/`：拼贴业务内部复用工具
  - `notes/`：笔记/数据存储相关
    - `repository/`：仓储层抽象与 Sequelize 实现

> 约定：`controller` 负责 HTTP 协议层；`service` 承载业务编排；`repository` 负责数据持久化；`providers` 负责对外部 AI 能力的适配与隔离。

#### apps/web（Vite + React 前端）

- 技术栈：Vite + React
- 主要职责：
  - 用户交互与上传/输入
  - 调用后端 API 并展示生成进度与生成结果

关键目录：

- `apps/web/src/main.tsx`：前端入口
- `apps/web/src/App.tsx`：应用主组件
- `apps/web/src/components/`：UI 组件（消息流、输入框、下载等）
- `apps/web/src/lib/`：前端工具库（如 stream 处理、重试、通用工具）

### packages/

放置在多个应用间复用的**共享包**。

- `packages/shared/`：跨 `api/web` 共享的类型、工具函数或常量

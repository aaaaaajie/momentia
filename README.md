# momentia (monorepo)

极简 monorepo：
- `apps/api`：NestJS + TypeScript + Sequelize + PostgreSQL
- `apps/web`：React + Ant Design + Vite
- `packages/shared`：共享类型（可选）

## 目录结构

- `apps/api` 后端服务
- `apps/web` 前端应用
- `packages/shared` 共享包
- `docker-compose.yml` 本地 PostgreSQL
- `.env.example` 环境变量示例

## 准备

1. 安装 pnpm（>=9）与 Node.js（>=20）
2. 复制环境变量文件：
   - 根目录：`.env.example` -> `.env`
   - `apps/api/.env.example` -> `apps/api/.env`（可选，使用根目录也行）
   - `apps/web/.env.example` -> `apps/web/.env`（可选）

## 启动数据库

在根目录：
- `pnpm db:up`

## 安装依赖

在根目录：
- `pnpm install`

## 开发启动

同时启动 api + web：
- `pnpm dev`

分别启动：
- `pnpm --filter @momentia/api dev`
- `pnpm --filter @momentia/web dev`

## 接口

- `GET /health` -> `{ ok: true }`
- `GET /notes`
- `POST /notes` -> `{ title, content? }`
- `GET /notes/:id`
- `PATCH /notes/:id`

## 说明

- 为了“尽可能简单”，API 端在启动时会 `sequelize.authenticate()` + `sequelize.sync()` 自动建表；生产环境建议替换为迁移方案。

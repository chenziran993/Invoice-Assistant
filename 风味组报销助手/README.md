# 风味组报销助手

基于 AI 的发票报销管理系统，专为江南大学风味组设计。采用 React + TypeScript 构建前端，Express + Supabase 构建后端服务，结合 Google Gemini AI 和阿里云 OCR 实现发票智能识别。

## 功能特性

- **AI 发票识别**：支持图片（PNG、JPG、JPEG）和 PDF 文件自动识别发票信息
- **智能分类**：支持多种发票类别（实验室用品、高通量测序、测试费、专利费/菌种保藏、版面费/快递费、市内交通费、设备/设备维修、其他）
- **报销状态跟踪**：可视化进度展示报销审批流程
- **审批工作流**：`发票盒 → 韩老师 → 财务助管 → 财务处 → 报销成功/退单`
- **用户管理**：支持学生/教工身份认证和管理员模式
- **数据导出**：支持 CSV 格式导出报销记录
- **重复检测**：自动检测重复发票号码，防止重复报销

## 技术架构

### 前端

- **框架**：React 19 + TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS 4
- **AI/OCR**：Google Gemini (gemini-3-flash-preview)
- **PDF 处理**：pdf.js

### 后端

- **框架**：Express.js + TypeScript
- **数据库**：Supabase (PostgreSQL)
- **认证**：JWT
- **OCR 服务**：阿里云 OCR API

### 目录结构

```
.
├── 风味组报销助手/          # 前端项目
│   ├── App.tsx            # 主应用组件
│   ├── types.ts           # TypeScript 类型定义
│   ├── services/          # API 服务
│   │   ├── api.ts         # API 调用封装
│   │   ├── geminiService.ts  # Gemini AI 服务
│   │   └── supabaseClient.ts # Supabase 客户端
│   ├── components/         # React 组件
│   ├── index.html         # HTML 入口
│   ├── index.css          # 全局样式
│   └── package.json
│
├── server/                # 后端项目
│   ├── src/
│   │   ├── index.ts       # Express 应用入口
│   │   ├── config/        # 配置
│   │   ├── routes/        # 路由
│   │   │   ├── auth.ts    # 认证路由
│   │   │   ├── records.ts # 报销记录路由
│   │   │   ├── admin.ts   # 管理员路由
│   │   │   └── ocr.ts     # OCR 路由
│   │   ├── middleware/    # 中间件
│   │   ├── services/      # 业务逻辑
│   │   └── lib/           # 库文件
│   └── package.json
│
└── docs/                  # 文档
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Supabase 账号
- Google Gemini API Key
- 阿里云 OCR 账号（可选）

### 1. 克隆项目

```bash
git clone https://github.com/chenziran993/Invoice-Assistant.git
cd Invoice-Assistant
```

### 2. 配置前端环境

```bash
cd 风味组报销助手
cp .env.example .env.local
```

编辑 `.env.local`：

```env
GEMINI_API_KEY=你的gemini_api_key
VITE_SUPABASE_URL=你的supabase_url
VITE_SUPABASE_ANON_KEY=你的supabase_anon_key
```

### 3. 配置后端环境

```bash
cd ../server
cp .env.example .env
```

编辑 `server/.env`：

```env
# Supabase 配置
SUPABASE_URL=你的supabase_url
SUPABASE_ANON_KEY=你的supabase_anon_key

# 阿里云 OCR 配置（用于发票识别）
ALIYUN_ACCESS_KEY_ID=你的access_key_id
ALIYUN_ACCESS_KEY_SECRET=你的access_key_secret

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=你的安全密码

# JWT 密钥
JWT_SECRET=你的jwt_secret_key

# 服务器配置
PORT=3000
NODE_ENV=production
```

### 4. 安装依赖

```bash
# 前端依赖
cd 风味组报销助手
npm install

# 后端依赖
cd ../server
npm install
```

### 5. 启动开发服务器

```bash
# 前端（风味组报销助手目录下）
npm run dev

# 后端（server 目录下）
npm run dev
```

前端默认运行在 `http://localhost:5173`，后端默认运行在 `http://localhost:3000`。

### 6. 生产环境构建

```bash
# 前端构建
cd 风味组报销助手
npm run build
npm run preview

# 后端构建
cd server
npm run build
npm start
```

## 数据库配置

在 Supabase 中创建 `reimbursement_records` 表：

```sql
CREATE TABLE reimbursement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(100),
  seller_name VARCHAR(255),
  buyer_name VARCHAR(255),
  seller_tax_id VARCHAR(50),
  buyer_tax_id VARCHAR(50),
  seller_bank_account VARCHAR(100),
  category VARCHAR(100),
  amount DECIMAL(10, 2),
  name VARCHAR(100),
  student_id VARCHAR(50),
  supervisor VARCHAR(100),
  phone VARCHAR(20),
  is_paid BOOLEAN DEFAULT FALSE,
  paid_edit_count INTEGER DEFAULT 0,
  survey_answers JSONB,
  status VARCHAR(20) DEFAULT 'box',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 策略
ALTER TABLE reimbursement_records ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的记录
CREATE POLICY "Users can view own records" ON reimbursement_records
  FOR SELECT USING (auth.uid()::text = student_id);

-- 用户可以创建自己的记录
CREATE POLICY "Users can create own records" ON reimbursement_records
  FOR INSERT WITH CHECK (auth.uid()::text = student_id);

-- 用户可以更新自己的记录
CREATE POLICY "Users can update own records" ON reimbursement_records
  FOR UPDATE USING (auth.uid()::text = student_id);

-- 用户可以删除自己的记录
CREATE POLICY "Users can delete own records" ON reimbursement_records
  FOR DELETE USING (auth.uid()::text = student_id);
```

## 使用指南

### 用户流程

1. **注册/登录**：输入姓名、学号、导师、联系电话
2. **上传发票**：支持拖拽或点击上传图片/PDF 文件
3. **AI 识别**：系统自动识别发票信息（发票号、金额、销售方等）
4. **选择类别**：根据发票内容选择对应的报销类别
5. **提交报销**：确认信息后提交报销单
6. **合规确认**：根据提示完成签字或支付记录确认
7. **进度追踪**：在报销流水页面查看审批进度

### 发票类别

| 类别 | 说明 |
|------|------|
| 实验室用品 | 实验材料、试剂耗材等 |
| 高通量测序 | 基因测序服务费用 |
| 测试费 | 各种检测、检验费用 |
| 专利费/菌种保藏 | 知识产权相关费用 |
| 版面费/快递费 | 论文发表、物流费用 |
| 市内交通费 | 市内交通出行费用 |
| 设备/设备维修 | 仪器设备采购与维护 |
| 其他 | 不属于以上类别的费用 |

### 报销状态

| 状态 | 说明 |
|------|------|
| 📦 box | 发票盒（初始状态）|
| 👩‍🦰 han | 韩老师审批中 |
| 👧 assistant | 财务助管审批中 |
| 🏛️ office | 财务处审批中 |
| ✅ success | 报销成功 |
| × rejected | 报销被驳回 |

### 管理员功能

- 登录管理入口查看所有用户的报销记录
- 更新报销状态，推进审批流程
- 驳回报销单并填写驳回原因
- 导出全部数据为 CSV 格式
- 删除无效报销记录

## 部署

### Vercel 部署前端

项目已配置 `vercel.json`，支持一键部署到 Vercel：

```bash
npm install -g vercel
vercel
```

### Docker 部署

项目支持 Docker 部署，请参考 `docs/plans/` 目录下的部署文档。

### 环境变量清单

**前端必需：**

| 变量名 | 说明 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini API 密钥 |
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |

**后端必需：**

| 变量名 | 说明 |
|--------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `ALIYUN_ACCESS_KEY_ID` | 阿里云 Access Key ID |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云 Access Key Secret |
| `ADMIN_USERNAME` | 管理员用户名 |
| `ADMIN_PASSWORD` | 管理员密码 |
| `JWT_SECRET` | JWT 签名密钥 |

**后端可选：**

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务器端口 | 3000 |
| `NODE_ENV` | 运行环境 | production |
| `ALLOWED_ORIGINS` | 允许的跨域来源（逗号分隔）| localhost:5173, localhost:3000 |

## 开发指南

### API 端点

**认证接口：**

- `POST /api/auth/login` - 用户登录
- `POST /api/admin/login` - 管理员登录

**报销记录接口：**

- `GET /api/records` - 获取当前用户记录
- `POST /api/records` - 创建新记录
- `DELETE /api/records/:id` - 删除记录
- `PUT /api/records/:id/paid` - 更新支付状态
- `PUT /api/records/:id/survey` - 提交合规问卷
- `GET /api/records/export` - 导出 CSV

**管理员接口：**

- `GET /api/admin/records` - 获取所有记录
- `PUT /api/admin/records/:id/status` - 更新记录状态
- `GET /api/admin/export` - 导出全部数据

**OCR 接口：**

- `POST /api/ocr/extract` - 识别发票信息

### 代码规范

- 使用 TypeScript 严格模式
- 组件采用函数式组件 + Hooks
- 状态更新使用不可变模式
- API 错误处理统一封装

## 许可证

MIT License

# 风味组报销助手 - 功能改进实现计划 (2026-03-02)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现5项功能改进：PDF识别、分页展示、名称搜索、查看大图、状态提示居中弹窗

**Architecture:** 前端 React 组件改动 + 后端 Express API 改动，无数据库结构变更

**Tech Stack:** React 19, TypeScript, Express.js, Supabase, 阿里云 OCR

---

## 任务概览

| 任务 | 描述 |
|------|------|
| 1 | 后端：OCR接口支持PDF识别 |
| 2 | 前端：PDF文件预览功能 |
| 3 | 前端：电子发票分页展示 |
| 4 | 前端：管理端名称模糊搜索 |
| 5 | 前端：发票卡片查看大图Modal |
| 6 | 前端：状态提示居中弹窗 |

---

### Task 1: 后端 - OCR接口支持PDF识别

**Files:**
- Modify: `D:\up\fapiao_zhushou_wang\server\src\routes\ocr.ts`

**Step 1: 查看现有OCR路由代码**

```bash
cat server/src/routes/ocr.ts
```

**Step 2: 修改OCR接口支持PDF**

在 `/ocr/extract` 接口中，修改文件处理逻辑以支持PDF：

```typescript
import * as fs from 'fs';
import * as path from 'path';

router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    let imageBase64: string;

    if (file) {
      // 文件上传模式
      if (file.mimetype === 'application/pdf') {
        // PDF文件直接转换为base64
        const pdfBuffer = fs.readFileSync(file.path);
        imageBase64 = pdfBuffer.toString('base64');
        // 标记为PDF，调用阿里云OCR时需要指定
      } else {
        // 图片文件
        const imageBuffer = fs.readFileSync(file.path);
        imageBase64 = imageBuffer.toString('base64');
      }
    } else {
      // 原有模式：base64直接传递
      imageBase64 = req.body.image;
    }

    // 调用阿里云OCR，传递文件类型信息
    const result = await callAliyunOCR(imageBase64, file?.mimetype);
    res.json(result);
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: 'OCR识别失败' });
  }
});
```

**Step 3: 提交**
```bash
git add server/src/routes/ocr.ts
git commit -m "feat: OCR接口支持PDF文件识别"
```

---

### Task 2: 前端 - PDF文件预览功能

**Files:**
- Modify: `D:\up\fapiao_zhushou_wang\风味组报销助手\App.tsx:174-198` (handleFileUpload)
- Modify: `D:\up\fapiao_zhushou_wang\风味组报销助手\App.tsx:504-520` (文件预览区)

**Step 1: 添加PDF.js库**

在 `风味组报销助手/package.json` 中添加依赖：

```bash
npm install pdfjs-dist
```

**Step 2: 修改文件上传处理**

修改 handleFileUpload 函数，处理PDF文件预览：

```typescript
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const fileList = e.target.files;
  if (!fileList) return;
  const selectedFiles = Array.from(fileList) as File[];

  const validFiles = selectedFiles.filter(f => {
    if (f.size > MAX_FILE_SIZE) {
      alert(`文件 ${f.name} 超过大小限制 (10MB)`);
      return false;
    }
    return true;
  });

  if (validFiles.length === 0) return;

  for (const file of validFiles) {
    let previewUrl: string;

    if (file.type === 'application/pdf') {
      // PDF文件需要转换为图片预览
      previewUrl = await convertPdfToImage(file);
    } else {
      previewUrl = URL.createObjectURL(file);
    }

    const newFile: ProcessingFile = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl,
      status: 'pending'
    };
    setFiles(prev => [...prev, newFile]);
    processFile(newFile, selectedCategory);
  }
};
```

**Step 3: 添加PDF转图片函数**

在 App.tsx 中添加：

```typescript
import * as pdfjsLib from 'pdfjs-dist';

// 设置worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const convertPdfToImage = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1); // 只取第一页

  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context!, viewport }).promise;
  return canvas.toDataURL('image/png');
};
```

**Step 4: 修改文件预览显示**

在文件预览区，PDF显示已有处理逻辑（显示PDF图标），确保正常工作。

**Step 5: 提交**
```bash
git add 风味组报销助手/App.tsx 风味组报销助手/package.json
git commit -m "feat: 支持PDF文件预览功能"
```

---

### Task 3: 前端 - 电子发票分页展示

**Files:**
- Modify: `D:\up\fapiao_zhushou_wang\风味组报销助手\App.tsx:28-38` (状态变量)
- Modify: `D:\up\fapiao_zhushou_wang\风味组报销助手\App.tsx:510-565` (发票列表展示)

**Step 1: 添加分页状态变量**

在现有状态变量区域添加：

```typescript
const [currentPage, setCurrentPage] = useState(1);
const ITEMS_PER_PAGE = 6;
```

**Step 2: 计算分页数据**

在渲染发票列表前添加：

```typescript
const paginatedFiles = useMemo(() => {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  return files.slice(start, start + ITEMS_PER_PAGE);
}, [files, currentPage]);

const totalPages = Math.ceil(files.length / ITEMS_PER_PAGE);
```

**Step 3: 修改发票列表渲染**

将 `files.map` 改为 `paginatedFiles.map`

**Step 4: 添加分页组件**

在发票列表后面添加分页UI：

```jsx
{files.length > ITEMS_PER_PAGE && (
  <div className="flex justify-center items-center gap-2 mt-6">
    <button
      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
      disabled={currentPage === 1}
      className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold disabled:opacity-50"
    >
      上一页
    </button>
    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
      <button
        key={page}
        onClick={() => setCurrentPage(page)}
        className={`w-10 h-10 rounded-xl text-sm font-bold ${
          currentPage === page
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        {page}
      </button>
    ))}
    <button
      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
      disabled={currentPage === totalPages}
      className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold disabled:opacity-50"
    >
      下一页
    </button>
  </div>
)}
```

**Step 5: 提交**
```bash
git add 风味组报销助手/App.tsx
git commit -m "feat: 电子发票列表添加分页功能"
```

---

### Task 4: 前端 - 管理端名称模糊搜索

**Files:**
- Modify: `D:\up\fapiao_zhushou_wang\风味组报销助手\App.tsx:28-38` (状态变量)
- Modify: `D:\up\fapiao_zhushou_wang\风味组报销助手\App.tsx:569-585` (管理端搜索)

**Step 1: 添加搜索状态变量**

```typescript
const [searchQuery, setSearchQuery] = useState('');
```

**Step 2: 过滤显示的记录**

修改 `displayRecords` 的计算逻辑：

```typescript
const displayRecords = useMemo(() => {
  let recordsToShow = isAdminMode ? records : userRecords;

  // 管理端名称搜索
  if (isAdminMode && searchQuery.trim()) {
    recordsToShow = recordsToShow.filter(r =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return recordsToShow;
}, [records, userRecords, isAdminMode, searchQuery]);
```

**Step 3: 添加搜索输入框**

在管理端页面标题旁边添加搜索框：

```jsx
{isAdminMode && (
  <div className="relative">
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="搜索用户名称..."
      className="border-2 px-4 py-2 rounded-xl text-sm focus:border-blue-500 outline-none"
    />
    {searchQuery && (
      <button
        onClick={() => setSearchQuery('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        ×
      </button>
    )}
  </div>
)}
```

**Step 4: 提交**
```bash
git add 风味组报销助手/App.tsx
git commit -m "feat: 管理端增加名称模糊搜索功能"
```

---

### Task 5: 前端 - 发票卡片查看大图Modal

**Files:**
- Modify: `D:\up\fapiao_zhushou_wang\风味组报销助手\App.tsx:28-38` (状态变量)
- Modify: `D:\up\fapiao_zhushou_wang\风味组报销助手\App.tsx:585-630` (记录卡片渲染)

**Step 1: 添加选中记录状态**

```typescript
const [selectedRecord, setSelectedRecord] = useState<SubmissionRecord | null>(null);
```

**Step 2: 修改记录卡片点击事件**

在用户端记录卡片上添加点击事件：

```jsx
// 在记录卡片外层div添加 onClick
<div
  onClick={() => !isAdminMode && setSelectedRecord(r)}
  className={`bg-white border-2 rounded-[2rem] p-8 transition-all group hover:shadow-2xl relative overflow-hidden flex flex-col cursor-pointer ${r.status === 'rejected' ? 'border-red-100 bg-red-50/10 shadow-red-50/20' : 'border-slate-50'}`}
>
```

**注意**：管理员模式不触发点击，避免与状态按钮冲突

**Step 3: 创建大图Modal组件**

在 App.tsx 中添加 Modal 渲染逻辑：

```jsx
{selectedRecord && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
    onClick={() => setSelectedRecord(null)}
  >
    <div
      className="bg-white rounded-[2rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black">发票详情</h2>
        <button
          onClick={() => setSelectedRecord(null)}
          className="text-2xl text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>

      {/* 发票大图 - 需要从记录中获取图片URL，目前使用占位图 */}
      <div className="bg-slate-100 rounded-2xl p-8 mb-6 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <span className="text-6xl block">🧾</span>
          <p className="text-sm mt-2">发票图片预览</p>
        </div>
      </div>

      {/* 发票信息 */}
      <div className="space-y-4">
        <div className="flex justify-between border-b pb-2">
          <span className="text-slate-500">发票号</span>
          <span className="font-bold">{selectedRecord.invoiceNumber}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-slate-500">金额</span>
          <span className="font-bold text-blue-600">¥{selectedRecord.amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-slate-500">类别</span>
          <span className="font-bold">{selectedRecord.category}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-slate-500">销售方</span>
          <span className="font-bold">{selectedRecord.sellerName || '-'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-slate-500">状态</span>
          <span className="font-bold">{selectedRecord.status}</span>
        </div>
      </div>
    </div>
  </div>
)}
```

**Step 4: 提交**
```bash
git add 风味组报销助手/App.tsx
git commit -m "feat: 用户端发票卡片增加查看大图功能"
```

---

### Task 6: 前端 - 状态提示居中弹窗

**Files:**
- Modify: `D:\up\fapiao_zhushou_wang\风味组报销助手\App.tsx:450-462` (现有状态消息渲染)
- Modify: `D:\up\fapiao_zhushou_wang\风味组报销助手\App.tsx:36-38` (useEffect清理)

**Step 1: 替换顶部状态提示为Modal**

删除原有的顶部状态提示div（第450-462行），替换为：

```jsx
{statusMessage && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    onClick={() => setStatusMessage(null)}
  >
    <div
      className={`bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 ${
        statusMessage.type === 'success' ? 'border-2 border-green-100' :
        statusMessage.type === 'error' ? 'border-2 border-red-100' :
        'border-2 border-blue-100'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 ${
          statusMessage.type === 'success' ? 'bg-green-100 text-green-600' :
          statusMessage.type === 'error' ? 'bg-red-100 text-red-600' :
          'bg-blue-100 text-blue-600'
        }`}>
          {statusMessage.type === 'success' ? '✓' :
           statusMessage.type === 'error' ? '✕' : 'ℹ'}
        </div>
        <p className={`text-lg font-bold ${
          statusMessage.type === 'success' ? 'text-green-700' :
          statusMessage.type === 'error' ? 'text-red-700' :
          'text-blue-700'
        }`}>
          {statusMessage.text}
        </p>
      </div>
    </div>
  </div>
)}
```

**Step 2: 确保自动关闭定时器正常**

现有代码已有自动关闭逻辑（useEffect设置3秒后清除），保持不变：

```typescript
useEffect(() => {
  if (statusMessage) {
    const timer = setTimeout(() => setStatusMessage(null), 3000);
    return () => clearTimeout(timer);
  }
}, [statusMessage]);
```

**Step 3: 提交**
```bash
git add 风味组报销助手/App.tsx
git commit -m "feat: 状态提示改为居中弹窗样式"
```

---

## 执行方式

**Plan complete and saved to `docs/plans/2026-03-02-feature-improvements-impl-plan.md`. Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**

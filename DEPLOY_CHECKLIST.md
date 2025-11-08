# 部署前检查清单

## ✅ 步骤 1: 检查项目配置

### 1.1 检查 package.json
- ✅ 已配置 `build` 脚本: `npm run build`
- ✅ 已配置 `dev` 脚本: `npm run dev`
- ⚠️ **注意**: 项目没有依赖项，如果构建失败可能需要安装 vite

### 1.2 检查 vite.config.js
- ✅ Root 目录: `web`
- ✅ 输出目录: `dist`
- ✅ Public 目录: `images` (图片资源)
- ✅ 配置正确

### 1.3 检查 vercel.json
- ✅ Framework: vite
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`
- ⚠️ **注意**: API 地址配置为 `https://reading-speed-training.com`，如果还没有后端，需要修改

### 1.4 检查文件结构
```
✅ web/
   ✅ index.html
   ✅ main.js
   ✅ api.js
   ✅ styles.css
   ✅ materials/ (年级材料)
✅ images/ (图片资源)
✅ vite.config.js
✅ vercel.json
✅ package.json
```

---

## 🔧 步骤 2: 安装依赖并测试构建

### 2.1 安装依赖
```bash
# 在项目根目录执行
npm install
```

如果 `package.json` 中没有 vite，需要先安装：
```bash
npm install vite --save-dev
```

### 2.2 测试本地开发
```bash
npm run dev
```
访问 http://localhost:5173 检查是否能正常运行

### 2.3 测试构建
```bash
npm run build
```
检查 `dist` 目录是否生成，确认构建成功

### 2.4 预览构建结果
```bash
npm run preview
```
访问预览地址，确认所有功能正常

---

## 📝 步骤 3: 修复配置问题

### 3.1 更新 package.json（如果需要）
如果构建时提示缺少 vite，需要添加依赖：

```json
{
  "name": "reading-speed-training",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

### 3.2 检查 API 配置
如果还没有后端 API，需要修改 `vercel.json`：

**选项 A: 暂时禁用 API（仅使用本地存储）**
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
  // 移除 env 配置，让前端检测 API_BASE 为空时使用本地存储
}
```

**选项 B: 配置实际的 API 地址**
在 Vercel 部署时，在环境变量中设置：
- `VITE_API_BASE`: 你的实际 API 地址

---

## 🚀 步骤 4: 准备 Git 仓库

### 4.1 更新 .gitignore
确保 `.gitignore` 包含：
```
node_modules/
dist/
.DS_Store
*.log
```

### 4.2 初始化 Git（如果还没有）
```bash
git init
git add .
git commit -m "准备部署"
```

### 4.3 创建 GitHub 仓库
1. 访问 https://github.com/new
2. 创建新仓库（例如：`reading-speed-training`）
3. **不要**初始化 README、.gitignore 或 license

### 4.4 推送代码
```bash
git remote add origin https://github.com/你的用户名/reading-speed-training.git
git branch -M main
git push -u origin main
```

---

## 🌐 步骤 5: 部署到 Vercel

### 5.1 登录 Vercel
- 访问 https://vercel.com
- 使用 GitHub 账号登录

### 5.2 导入项目
1. 点击 "Add New Project"
2. 选择你的 GitHub 仓库
3. Vercel 会自动检测配置

### 5.3 配置项目设置
- **Framework Preset**: Vite（自动识别）
- **Root Directory**: `./`（项目根目录）
- **Build Command**: `npm run build`（已配置）
- **Output Directory**: `dist`（已配置）

### 5.4 环境变量（如果需要 API）
如果使用后端 API，在 "Environment Variables" 中添加：
- `VITE_API_BASE`: `你的API地址`

### 5.5 部署
- 点击 "Deploy"
- 等待构建完成（1-2分钟）

### 5.6 获取访问链接
部署完成后，你会得到：
- 默认域名: `https://你的项目名.vercel.app`
- 可以分享给任何人访问

---

## ⚠️ 常见问题排查

### 问题 1: 构建失败 - "vite: command not found"
**解决**: 需要安装 vite
```bash
npm install vite --save-dev
```

### 问题 2: 图片不显示
**检查**: 
- `vite.config.js` 中的 `publicDir` 配置
- 图片路径是否为 `/images/index/xxx.png` 格式

### 问题 3: API 请求失败
**解决**: 
- 如果暂时没有后端，移除 `vercel.json` 中的 `env.VITE_API_BASE`
- 前端会自动使用本地存储模式

### 问题 4: 路由不工作
**检查**: 
- 确保使用 Hash 路由（`#/index`）
- Vercel 会自动处理 SPA 路由

---

## 📋 快速部署命令总结

```bash
# 1. 安装依赖
npm install

# 2. 测试构建
npm run build

# 3. 初始化 Git（如果还没有）
git init
git add .
git commit -m "准备部署"

# 4. 推送到 GitHub
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main

# 5. 在 Vercel 部署
# 访问 https://vercel.com，导入 GitHub 仓库，点击 Deploy
```

---

## ✅ 部署后验证

部署完成后，检查：
- [ ] 网站可以正常访问
- [ ] 图片正常显示
- [ ] 登录功能正常
- [ ] 训练功能正常
- [ ] 本地存储功能正常（如果未配置 API）
- [ ] 在不同设备/浏览器上测试

---

完成这些步骤后，你的网站就可以被任何人访问了！🎉


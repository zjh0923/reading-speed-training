# 网页版部署指南

## 方案一：通过 Vercel 部署（推荐）

### 步骤 1：准备代码仓库

1. **初始化 Git 仓库**（如果还没有）
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **创建 GitHub 仓库**
   - 访问 https://github.com/new
   - 创建新仓库（例如：`reading-speed-training`）
   - **不要**初始化 README、.gitignore 或 license（如果本地已有）

3. **推送代码到 GitHub**
   ```bash
   git remote add origin https://github.com/你的用户名/reading-speed-training.git
   git branch -M main
   git push -u origin main
   ```

### 步骤 2：在 Vercel 部署

1. **注册/登录 Vercel**
   - 访问 https://vercel.com
   - 使用 GitHub 账号登录（推荐）

2. **导入项目**
   - 点击 "Add New Project"
   - 选择你的 GitHub 仓库
   - Vercel 会自动检测到 `vercel.json` 配置

3. **配置项目设置**
   - **Framework Preset**: Vite（会自动识别）
   - **Root Directory**: 保持默认（或设置为项目根目录）
   - **Build Command**: `npm run build`（已配置）
   - **Output Directory**: `dist`（已配置）
   - **Install Command**: `npm install`（默认）

4. **环境变量配置**（如果需要）
   - 在 Vercel 项目设置中添加环境变量：
     - `VITE_API_BASE`: `https://reading-speed-training.com`（或你的实际 API 地址）

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成（通常 1-2 分钟）

6. **获取访问链接**
   - 部署完成后，Vercel 会提供：
     - 默认域名：`https://你的项目名.vercel.app`
     - 可以自定义域名（在 Settings > Domains 中配置）

### 步骤 3：自定义域名（可选）

1. 在 Vercel 项目设置中进入 "Domains"
2. 添加你的域名（如 `reading-speed-training.com`）
3. 按照提示配置 DNS 记录
4. 等待 DNS 生效（通常几分钟到几小时）

---

## 方案二：通过 Netlify 部署

### 步骤 1：准备代码并推送到 GitHub（同上）

### 步骤 2：在 Netlify 部署

1. 访问 https://www.netlify.com
2. 使用 GitHub 账号登录
3. 点击 "Add new site" > "Import an existing project"
4. 选择你的 GitHub 仓库
5. 配置构建设置：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. 点击 "Deploy site"

---

## 方案三：使用 Vercel CLI 本地部署

### 步骤 1：安装 Vercel CLI

```bash
npm install -g vercel
```

### 步骤 2：登录

```bash
vercel login
```

### 步骤 3：部署

```bash
# 在项目根目录执行
vercel

# 首次部署会询问配置，按提示操作
# 生产环境部署使用：
vercel --prod
```

---

## 方案四：使用其他静态托管服务

### GitHub Pages（免费但有限制）

1. 构建项目：
   ```bash
   npm run build
   ```

2. 在 GitHub 仓库设置中启用 GitHub Pages
3. 选择 `dist` 目录作为源目录

### 其他选项：
- **Cloudflare Pages**: https://pages.cloudflare.com
- **Firebase Hosting**: https://firebase.google.com/docs/hosting
- **阿里云 OSS / 腾讯云 COS**: 国内访问较快

---

## 部署前检查清单

- [ ] 确保 `npm run build` 能成功构建
- [ ] 检查 `vercel.json` 配置是否正确
- [ ] 确认环境变量已配置（如需要）
- [ ] 测试本地预览：`npm run preview`
- [ ] 检查图片路径是否正确
- [ ] 确认 API 地址配置正确（如果使用后端）

---

## 常见问题

### 1. 构建失败
- 检查 Node.js 版本（推荐 16+）
- 查看构建日志中的错误信息
- 确保所有依赖都已安装

### 2. 图片不显示
- 确认 `vite.config.js` 中的 `publicDir` 配置正确
- 检查图片路径是否为 `/images/...` 格式

### 3. 路由不工作
- SPA 应用需要配置重定向规则（Vercel 已自动处理）
- 确保使用 Hash 路由（`#/index`）

### 4. API 请求失败
- 检查 CORS 配置
- 确认 API 地址正确
- 检查环境变量是否设置

---

## 快速开始（推荐流程）

1. **推送代码到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Ready for deployment"
   git remote add origin https://github.com/你的用户名/reading-speed-training.git
   git push -u origin main
   ```

2. **在 Vercel 部署**
   - 访问 https://vercel.com
   - 导入 GitHub 仓库
   - 点击 Deploy
   - 等待完成，获取访问链接

3. **完成！** 🎉
   - 你的网站现在可以通过 Vercel 提供的链接访问了


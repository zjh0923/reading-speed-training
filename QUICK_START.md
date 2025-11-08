# 🚀 快速部署指南（5分钟上线）

## 最简单的方法：Vercel 一键部署

### 第一步：准备代码（2分钟）

1. **安装依赖**（如果还没有）
   ```bash
   npm install
   ```

2. **测试构建**
   ```bash
   npm run build
   ```
   如果成功，会看到 `dist` 文件夹

3. **初始化 Git 并推送到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "准备部署"
   
   # 在 GitHub 创建新仓库后：
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```

### 第二步：Vercel 部署（3分钟）

1. **访问 Vercel**
   - 打开 https://vercel.com
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New Project"
   - 选择你的 GitHub 仓库
   - 点击 "Import"

3. **配置（通常自动识别，直接下一步）**
   - Framework: Vite ✅
   - Build Command: `npm run build` ✅
   - Output Directory: `dist` ✅

4. **部署**
   - 点击 "Deploy"
   - 等待 1-2 分钟

5. **完成！** 🎉
   - 你会得到一个链接：`https://你的项目名.vercel.app`
   - 这个链接可以分享给任何人！

---

## 如果遇到问题

### ❌ "vite: command not found"
**解决**: 
```bash
npm install vite --save-dev
```

### ❌ "API 请求失败"
**解决**: 
- 如果还没有后端 API，这是正常的
- 网页版会自动使用本地存储（localStorage）
- 功能完全正常，只是数据保存在浏览器本地

### ❌ 图片不显示
**解决**: 
- 检查 `vite.config.js` 中的 `publicDir` 配置
- 确保图片路径是 `/images/index/xxx.png` 格式

---

## 完成后验证

部署成功后，打开你的网站链接，检查：
- ✅ 页面能正常加载
- ✅ 可以登录/注册
- ✅ 可以开始训练
- ✅ 图片正常显示

---

## 下一步（可选）

### 自定义域名
1. 在 Vercel 项目设置中进入 "Domains"
2. 添加你的域名（如 `reading-speed-training.com`）
3. 按提示配置 DNS

### 配置后端 API（如果以后需要）
1. 在 Vercel 项目设置中添加环境变量：
   - `VITE_API_BASE`: `你的API地址`
2. 重新部署

---

**就这么简单！你的网站现在全世界都可以访问了！** 🌍


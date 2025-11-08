# 在 VS Code 中推送代码（仓库已存在）

## 问题说明

错误信息："Repository creation failed. (name already exists on this account)"

**这很正常！** 说明仓库 `reading-speed-training` 已经在 GitHub 上存在了，你只需要推送代码到现有仓库。

---

## ✅ 解决方法：直接推送代码

### 方法 1：使用 VS Code 的源代码管理

#### 步骤 1：提交更改

1. 在 VS Code 左侧边栏，点击 **"源代码管理"** 图标（或按 `Ctrl+Shift+G`）
2. 在 "消息" 框中输入提交信息：`准备部署`
3. 点击 **"提交"** 按钮（或按 `Ctrl+Enter`）

#### 步骤 2：推送代码

1. 提交后，点击右上角的 **"..."** 菜单
2. 选择 **"推送"**（Push）
3. 如果提示输入认证信息：
   - **用户名**：`zjh0923`
   - **密码**：输入你的 **Personal Access Token**（不是 GitHub 密码）
   - 如果没有 Token，看下面的步骤创建

#### 步骤 3：创建 Personal Access Token（如果还没有）

1. 访问：https://github.com/settings/tokens
2. 点击 **"Generate new token"** → **"Generate new token (classic)"**
3. 设置：
   - Note：`vs-code-push`
   - Expiration：`90 days`
   - 勾选：`repo`（全部权限）
4. 点击 **"Generate token"**
5. **复制 Token**（只显示一次！）

---

### 方法 2：使用 VS Code 终端

1. 在 VS Code 中，按 `` Ctrl+` `` 打开终端
2. 确保终端是 Git Bash 或 PowerShell
3. 执行以下命令：

```bash
# 检查状态
git status

# 添加所有更改
git add .

# 提交（如果还没有）
git commit -m "准备部署"

# 推送
git push -u origin main
```

4. 如果提示输入认证：
   - Username: `zjh0923`
   - Password: 粘贴你的 Personal Access Token

---

## 🔍 如果推送时提示认证失败

### 问题：需要输入用户名和密码

**解决**：使用 Personal Access Token

1. 创建 Token（见上面的步骤）
2. 推送时：
   - 用户名：`zjh0923`
   - 密码：**粘贴 Token**（不是 GitHub 密码）

### 问题：提示 "Authentication failed"

**解决**：
1. 检查 Token 是否正确复制
2. 确认 Token 有 `repo` 权限
3. 重新推送

---

## 📋 完整操作流程

### 在 VS Code 中：

1. **提交更改**
   - 源代码管理 → 输入提交信息 → 点击提交

2. **推送代码**
   - 点击右上角 "..." → 选择 "推送"
   - 或使用终端：`git push -u origin main`

3. **输入认证**
   - Username: `zjh0923`
   - Password: 你的 Personal Access Token

4. **验证成功**
   - 访问：https://github.com/zjh0923/reading-speed-training
   - 确认能看到最新代码

---

## 🚀 推送成功后，在 Vercel 部署

一旦代码推送成功：

1. 访问：https://vercel.com
2. 登录（GitHub 账号）
3. 点击 "Add New Project"
4. 选择 `reading-speed-training` 仓库
5. 点击 "Deploy"

---

## 💡 提示

- 仓库已经存在是正常的，不需要重新创建
- 只需要推送代码到现有仓库即可
- 如果遇到认证问题，使用 Personal Access Token

按照上面的步骤操作，应该就能成功推送了！


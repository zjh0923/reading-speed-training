# 安装 Node.js 指南

## 问题：npm 命令未找到

错误信息显示：`npm : 无法将"npm"项识别为 cmdlet、函数、脚本文件或可运行程序的名称`

这说明你的系统还没有安装 Node.js（npm 是 Node.js 的一部分）。

---

## 🚀 解决方案：安装 Node.js

### 方法一：官方安装器（推荐）

1. **下载 Node.js**
   - 访问：https://nodejs.org/zh-cn/
   - 下载 **LTS 版本**（长期支持版本，推荐）
   - 选择 Windows 安装器（.msi 文件）

2. **安装 Node.js**
   - 双击下载的 .msi 文件
   - 按照安装向导操作
   - **重要**：确保勾选 "Add to PATH" 选项（默认应该已勾选）
   - 完成安装

3. **验证安装**
   - **关闭当前 PowerShell 窗口**
   - **重新打开新的 PowerShell 窗口**
   - 输入以下命令验证：
     ```powershell
     node --version
     npm --version
     ```
   - 如果显示版本号，说明安装成功！

4. **在项目目录安装依赖**
   ```powershell
   cd D:\reading-speed-training
   npm install
   ```

---

### 方法二：使用 Chocolatey（如果已安装）

如果你已经安装了 Chocolatey 包管理器：

```powershell
choco install nodejs
```

---

### 方法三：使用 winget（Windows 10/11）

```powershell
winget install OpenJS.NodeJS.LTS
```

---

## ⚠️ 重要提示

### 安装后必须重启终端

安装 Node.js 后，**必须关闭并重新打开 PowerShell**，这样系统才能识别新的命令。

### 验证安装步骤

在新打开的 PowerShell 中运行：

```powershell
# 检查 Node.js 版本（应该显示类似 v20.x.x）
node --version

# 检查 npm 版本（应该显示类似 10.x.x）
npm --version

# 如果两个命令都显示版本号，说明安装成功！
```

---

## 🔄 如果已经安装了 Node.js

如果之前已经安装了 Node.js，但命令仍然无法识别，可能是 PATH 环境变量的问题：

### 检查 Node.js 是否已安装

1. 打开文件资源管理器
2. 导航到：`C:\Program Files\nodejs\` 或 `C:\Users\你的用户名\AppData\Roaming\npm`
3. 如果这些文件夹存在，说明已安装但 PATH 未配置

### 修复 PATH 环境变量

1. 按 `Win + R`，输入 `sysdm.cpl`，回车
2. 点击 "高级" 标签页
3. 点击 "环境变量"
4. 在 "系统变量" 中找到 `Path`
5. 点击 "编辑"
6. 添加以下路径（如果不存在）：
   - `C:\Program Files\nodejs\`
   - `C:\Users\你的用户名\AppData\Roaming\npm`
7. 点击 "确定" 保存
8. **重启 PowerShell**

---

## 📦 安装完成后继续部署

一旦 Node.js 安装成功，回到项目目录继续：

```powershell
# 1. 进入项目目录
cd D:\reading-speed-training

# 2. 安装依赖
npm install

# 3. 测试构建
npm run build

# 4. 如果构建成功，继续部署步骤
```

---

## 🎯 快速检查清单

- [ ] 已下载 Node.js LTS 版本
- [ ] 已运行安装程序
- [ ] 已关闭并重新打开 PowerShell
- [ ] 运行 `node --version` 显示版本号
- [ ] 运行 `npm --version` 显示版本号
- [ ] 可以运行 `npm install`

完成这些步骤后，就可以继续部署了！🚀

---

## 💡 如果不想安装 Node.js

如果你不想在本地安装 Node.js，也可以直接使用 Vercel 的在线部署：

1. 直接将代码推送到 GitHub（不需要构建）
2. 在 Vercel 导入项目时，Vercel 会自动安装依赖并构建
3. 不需要本地安装 Node.js

但前提是代码已经推送到 GitHub。


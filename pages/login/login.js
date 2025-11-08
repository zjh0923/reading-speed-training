// pages/login/login.js
const app = getApp()

Page({
  data: {
    username: '',
    usergender: '',
    usergrade: '',
    userclass: '',
    userage: '',
    photo: '',
    usergroup: '',
    accountId: '',
    isNewAccount: true,
    isEditing: false
  },

  onLoad(options) {
    const { action, accountId } = options || {};
    
    // 设置页面标题
    if (action === 'edit' && accountId) {
      wx.setNavigationBarTitle({
        title: '编辑账号'
      });
      this.loadAccountForEdit(accountId);
    } else if (action === 'create') {
      wx.setNavigationBarTitle({
        title: '创建新账号'
      });
      this.setData({
        isNewAccount: true,
        isEditing: false,
        username: '',
        usergender: '',
        usergrade: '',
        userclass: '',
        userage: '',
        photo: '',
        usergroup: ''
      });
    } else {
      wx.setNavigationBarTitle({
        title: '用户登录'
      });
      this.checkExistingAccounts();
    }
  },

  // 检查已有账号
  checkExistingAccounts() {
    const accountList = wx.getStorageSync('accountList') || [];
    
    if (accountList.length > 0) {
      // 如果已有账号，跳转到账号选择页面
      wx.redirectTo({
        url: '/pages/account-select/account-select'
      });
    } else {
      // 没有账号，停留在登录页面创建第一个账号
      this.setData({
        isNewAccount: true,
        isEditing: false
      });
    }
  },

  // 加载要编辑的账号信息
  loadAccountForEdit(accountId) {
    const accountList = wx.getStorageSync('accountList') || [];
    const account = accountList.find(acc => acc.accountId === accountId);
    
    if (account) {
      this.setData({
        username: account.name || '',
        usergender: account.gender || '',
        usergrade: account.grade || '',
        userclass: account.class || '',
        userage: account.age || '',
        photo: account.photo || '',
        usergroup: account.group || '',
        accountId: account.accountId,
        isNewAccount: false,
        isEditing: true
      });
    }
  },

  changeGroup(e) {
    this.setData({
      usergroup: ['1','2','3','4'][e.detail.value]
    })
  },

  choosePhoto(e) {
    wx.cloud.uploadFile({
      cloudPath: `avatars/${Date.now()}`,
      filePath: e.detail.avatarUrl,
    })
    .then(res => {
      const fileID = res.fileID;
      return wx.cloud.getTempFileURL({
        fileList: [fileID]
      });
    })
    .then(tempRes => {
      const tempImageUrl = tempRes.fileList[0].tempFileURL;
      this.setData({ photo: tempImageUrl });
    })
    .catch(err => {
      console.error('头像上传失败：', err);
      wx.showToast({ title: '头像上传失败', icon: 'none' });
    });
  },

  changeGender(e) {
    this.setData({
      usergender: ['男','女'][e.detail.value]
    })
  },

  changeGrade(e) {
    this.setData({
      usergrade: ['3','4','5'][e.detail.value]
    })
  },

  onNameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onClassInput(e) {
    this.setData({ userclass: e.detail.value })
  },

  onAgeInput(e) {
    this.setData({ userage: e.detail.value })
  },

  // 提交用户信息
  showName() {
    // 数据校验
    const requiredFields = [
      { field: 'username', name: '姓名' },
      { field: 'usergender', name: '性别' },
      { field: 'usergrade', name: '年级' },
      { field: 'usergroup', name: '组别' }
    ];

    for (const item of requiredFields) {
      if (!this.data[item.field]) {
        wx.showToast({ title: `请填写${item.name}`, icon: 'none' });
        return;
      }
    }

    // 生成或使用现有账号ID
    const accountId = this.data.isEditing ? this.data.accountId : 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // 构建用户数据对象
    const userInfo = {
      name: this.data.username,
      gender: this.data.usergender,
      grade: this.data.usergrade,
      class: this.data.userclass || '',
      age: this.data.userage || '',
      photo: this.data.photo || '',
      group: this.data.usergroup,
      createTime: this.data.isEditing ? (this.data.createTime || new Date().toISOString()) : new Date().toISOString(),
      accountId: accountId,
      isCurrent: true
    };

    // 显示加载状态
    wx.showLoading({ 
      title: this.data.isEditing ? '更新中...' : '创建中...', 
      mask: true 
    });

    // 保存账号信息
    this.saveAccountInfo(userInfo);
  },

  // 保存账号信息
  saveAccountInfo(userInfo) {
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: this.data.isEditing ? { ...userInfo, _id: this.data._id } : userInfo
    })
    .then(res => {
      if (res.result.success) {
        if (res.result.type === 'create') {
          userInfo._id = res.result._id
        }
        this.saveToLocalStorage(userInfo)
      } else {
        throw new Error(res.result.message || '云数据库保存失败')
      }
    })
    .catch(err => {
      console.error('云数据库保存失败：', err)
      wx.showToast({
        title: '网络异常，已保存到本地',
        icon: 'none'
      })
      this.saveToLocalStorage(userInfo)
    })
  },

  // 保存到本地存储
  saveToLocalStorage(userInfo) {
    const accountList = wx.getStorageSync('accountList') || [];
    
    if (this.data.isEditing) {
      // 编辑模式：更新现有账号
      const updatedList = accountList.map(acc => 
        acc.accountId === userInfo.accountId ? { ...acc, ...userInfo } : acc
      );
      wx.setStorageSync('accountList', updatedList);
      
      // 如果编辑的是当前账号，更新当前信息
      const currentAccountId = wx.getStorageSync('currentAccountId');
      if (currentAccountId === userInfo.accountId) {
        wx.setStorageSync('userInfo', userInfo);
        app.globalData.userInfo = userInfo;
      }
      
      this.completeSave('更新成功');
    } else {
      // 创建模式：添加新账号
      const newAccountList = [...accountList, userInfo];
      wx.setStorageSync('accountList', newAccountList);
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('currentAccountId', userInfo.accountId);
      app.globalData.userInfo = userInfo;
      
      this.completeSave('创建成功');
    }
  },

  // 完成保存操作
  completeSave(successMsg) {
    wx.hideLoading();
    wx.showToast({ 
      title: successMsg,
      icon: 'success',
      success: () => {
        setTimeout(() => {
          if (this.data.isEditing) {
            // 编辑完成后返回账号选择页面
            wx.navigateBack();
          } else {
            // 新账号创建完成后跳转到首页
            wx.reLaunch({
              url: '/pages/index/index'
            });
          }
        }, 1500);
      }
    });
  },

  // 删除账号
  deleteAccount() {
    if (!this.data.isEditing) return;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除账号"${this.data.username}"吗？此操作不可恢复。`,
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          this.performDelete();
        }
      }
    });
  },

  performDelete() {
    const accountList = wx.getStorageSync('accountList') || [];
    const updatedList = accountList.filter(acc => acc.accountId !== this.data.accountId);
    
    if (updatedList.length === 0) {
      // 如果是最后一个账号，清空所有数据
      wx.removeStorageSync('accountList');
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('currentAccountId');
      wx.removeStorageSync('isVerified'); // 清除验证状态
      app.globalData.userInfo = null;
    } else {
      wx.setStorageSync('accountList', updatedList);
      
      // 如果删除的是当前账号，切换到第一个账号
      const currentAccountId = wx.getStorageSync('currentAccountId');
      if (currentAccountId === this.data.accountId) {
        const firstAccount = updatedList[0];
        wx.setStorageSync('userInfo', firstAccount);
        wx.setStorageSync('currentAccountId', firstAccount.accountId);
        app.globalData.userInfo = firstAccount;
      }
    }
    
    wx.showToast({
      title: '账号已从本地移除',
      icon: 'success',
      success: () => {
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  }
})
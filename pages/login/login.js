const app = getApp()
Page({
  // 数据初始化
  data: {
    username: '',
    usergender: '',
    usergrade: '',
    userclass: '',
    userage: '',
    photo: '',
    usergroup: '', 
  },
  changeGroup(e) {
    this.setData({
      usergroup: ['1','2','3'][e.detail.value]
    })
  },

  onLoad() {
    // 检查全局数据 app.globalData.userInfo中是否有值
    const globalUser = app.globalData.userInfo
    // 检查本地存储 userInfo 是否有值
    const storageUser = wx.getStorageSync('userInfo')
    // 将数据合并到当前页面的 data 中，实现用户信息的持久化。
    if (globalUser || storageUser) {
      this.setData({
        ...(globalUser || storageUser)
      })
    }
    if (app.globalData.userInfo) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  choosePhoto(e) {
    wx.cloud.uploadFile({
      cloudPath: `avatars/${Date.now()}`,
      filePath: e.detail.avatarUrl,
    }).then(res => {
      this.setData({ photo: res.fileID })
    }).catch(err => {
      console.error('头像上传失败：', err)
      wx.showToast({ title: '头像上传失败', icon: 'none' })
    })
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



showName() {
  // 1. 数据校验
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

  // 2. 构建用户数据对象
  const userInfo = {
    name: this.data.username,
    gender: this.data.usergender,
    grade: this.data.usergrade,
    class: this.data.userclass || '', // 允许为空
    age: this.data.userage || '',     // 允许为空
    photo: this.data.photo || '',     // 允许为空
    group: this.data.usergroup,
    createTime: new Date().toISOString(),// 新增注册时间字段
  };

  // 3. 显示加载状态
  wx.showLoading({ title: '提交中...', mask: true });

  // 4. 分步操作：
  //    a. 先更新用户信息到数据库
  //    b. 再获取用户openid
  //    c. 最后存储到本地和全局

  // 云函数调用：updateUserInfo：将用户信息更新到数据库。getUserInfo：获取用户 openid（用于标识用户唯一性）
  wx.cloud.callFunction({
    name: 'updateUserInfo',
    data: userInfo,
  })
  .then(() => wx.cloud.callFunction({ name: 'getUserInfo' })) // 获取openid,同一用户在同一小程序中的 openid 永久不变
  .then(() => {
    // 存储关键信息（不再需要获取openid）
    wx.setStorageSync('userInfo', userInfo)
    app.globalData.userInfo = userInfo
    
    wx.showToast({ 
      title: '提交成功',
      success: () => {
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' })
        }, 1500);
      }
    });
  })
  .catch(err => {
    console.error('提交失败：', err);
    wx.hideLoading();
    wx.showToast({ 
      title: '提交失败：' + (err.errMsg || '未知错误'),
      icon: 'none',
      duration: 3000
    });
  });
}
})
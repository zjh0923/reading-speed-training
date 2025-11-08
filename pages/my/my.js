// pages/my/my.js
const app = getApp()

Page({
  data: {
    userInfo: {} // 初始化空对象
  },

  onShow() {
    this.loadUserInfo()
  },

  // 加载用户信息方法
  loadUserInfo() {
    // 先尝试从全局数据获取
    if (app.globalData.userInfo && app.globalData.userInfo.name) {
      this.setData({ userInfo: app.globalData.userInfo })
      return
    }

    // 显示加载状态
    wx.showLoading({ title: '加载中...', mask: true })

    // 获取当前账号ID
    const currentAccountId = wx.getStorageSync('currentAccountId');
    if (!currentAccountId) {
      wx.hideLoading();
      wx.showToast({ title: '未找到当前账号信息', icon: 'none' });
      return;
    }

    console.log('当前账号ID:', currentAccountId);

    // 关键修改：根据 accountId 查询用户信息，而不是 _openid
    wx.cloud.database().collection('users')
      .where({
        accountId: currentAccountId  // 改为按 accountId 查询
      })
      .get()
      .then(queryRes => {
        wx.hideLoading()
        
        if (queryRes.data.length > 0) {
          const userInfo = queryRes.data[0]
          console.log('从云端获取用户信息:', userInfo);
          // 更新页面数据
          this.setData({ userInfo })
          // 更新全局数据
          app.globalData.userInfo = userInfo
        } else {
          wx.showToast({ title: '未找到用户信息', icon: 'none' })
        }
      })
      .catch(err => {
        wx.hideLoading()
        console.error('获取用户信息失败：', err)
        wx.showToast({ title: '数据加载失败', icon: 'none' })
      })
  },


  // 切换账号功能
  switchAccount() {
    const accountList = wx.getStorageSync('accountList') || [];
    
    // 跳转到账号选择页面
    wx.navigateTo({
      url: '/pages/account-select/account-select'
    });
  },

  goToTrainRecords() {
    wx.navigateTo({
      url: '/pages/train-records/train-records'
    });
  }
})
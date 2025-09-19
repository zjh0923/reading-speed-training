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

    // 云开发操作
    wx.cloud.callFunction({
      name: 'getUserInfo'
    }).then(res => {
      const openid = res.result.openid
      return wx.cloud.database().collection('users')
        .where({ _openid: openid })
        .get()
    }).then(queryRes => {
      wx.hideLoading()
      
      if (queryRes.data.length > 0) {
        const userInfo = queryRes.data[0]
        // 更新页面数据
        this.setData({ userInfo })
        // 更新全局数据
        app.globalData.userInfo = userInfo
      } else {
        wx.showToast({ title: '未找到用户信息', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('获取用户信息失败：', err)
      wx.showToast({ title: '数据加载失败', icon: 'none' })
    })
  },

  goToTrainRecords() {
    wx.navigateTo({
      url: '/pages/train-records/train-records'
    });
  },


})
// app.js
App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-2gmoteq3c7464573', traceUser: true })

    // 1. 检查是否已经登录
    const localUser = wx.getStorageSync('userInfo')
    const openid = wx.getStorageSync('openid')
    
    if (localUser && openid) {
      // 已登录，直接跳转首页
      this.globalData.userInfo = localUser
      this.globalData.openid = openid
      wx.switchTab({ url: '/pages/index/index' })
      return
    }

    // 2. 未登录，跳转到密码页面
    wx.reLaunch({ url: '/pages/password/password' })
  },

  globalData: {
    userInfo: null,
    openid: null
  }
})
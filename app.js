// app.js
App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-2gmoteq3c7464573', traceUser: true })

    // 1. 先检查本地是否有用户信息
    const localUser = wx.getStorageSync('userInfo')
    const openid = wx.getStorageSync('openid')
    
    if (localUser && openid) {
      this.globalData.userInfo = localUser
      this.globalData.openid = openid
      wx.switchTab({ url: '/pages/index/index' }) // 直接跳转首页
      return
    }

    // 2. 没有本地信息则走登录流程
    wx.cloud.callFunction({ 
      name: 'getUserInfo' 
    }).then(res => {
      const openid = res.result.openid
      wx.setStorageSync('openid', openid)
      
      // 3. 检查数据库是否存在该用户
      wx.cloud.callFunction({
        name: 'checkUserExist',
        data: { openid }
      }).then(res => {
        if (res.result.exist) {
          wx.setStorageSync('userInfo', res.result.userInfo)
          this.globalData.userInfo = res.result.userInfo
          wx.switchTab({ url: '/pages/index/index' }) // 跳转首页
        } else {
          wx.reLaunch({ url: '/pages/login/login' }) // 跳转注册页
        }
      })
    }).catch(() => {
      wx.reLaunch({ url: '/pages/login/login' }) // 异常也跳转注册页
    }) 
  },

  globalData: {
    userInfo: null,
    openid: null
  }
})
// pages/password/password.js
Page({
  data: {
    password: '',
    isPasswordVisible: false,
    message: '',
    messageType: ''
  },

  onLoad() {
    // 检查是否已经验证过且有账号
    this.checkAuthStatus();
  },

  checkAuthStatus() {
    const accountList = wx.getStorageSync('accountList') || [];
    const isVerified = wx.getStorageSync('isVerified');
    
    // 如果已经验证过且有账号，直接进入首页
    if (isVerified && accountList.length > 0) {
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value,
      message: '' // 清空消息
    });
  },

  togglePasswordVisibility() {
    this.setData({
      isPasswordVisible: !this.data.isPasswordVisible
    });
  },

  onSubmit() {
    const password = this.data.password;
    
    if (!password) {
      this.showMessage('请输入密码', 'error');
      return;
    }
    
    // 正确密码设为010121
    if (password === '010121') {
      this.showMessage('验证成功，正在进入...', 'success');
      
      // 设置验证状态
      wx.setStorageSync('isVerified', true);
      
      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        const accountList = wx.getStorageSync('accountList') || [];
        
        if (accountList.length > 0) {
          // 有账号，直接进入首页
          wx.reLaunch({
            url: '/pages/index/index'
          });
        } else {
          // 没有账号，进入登录页面创建账号
          wx.reLaunch({
            url: '/pages/login/login?action=create'
          });
        }
      }, 1000);
    } else {
      this.showMessage('密码错误，请重新输入', 'error');
      this.setData({
        password: ''
      });
    }
  },

  showMessage(text, type) {
    this.setData({
      message: text,
      messageType: type
    });
  }
})
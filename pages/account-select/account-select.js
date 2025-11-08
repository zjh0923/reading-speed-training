// pages/account-select/account-select.js
const app = getApp();

Page({
  data: {
    accountList: []
  },

  onLoad() {
    this.loadAccounts();
  },

  onShow() {
    this.loadAccounts();
  },

  loadAccounts() {
    const accountList = wx.getStorageSync('accountList') || [];
    const currentAccountId = wx.getStorageSync('currentAccountId');
    
    // 标记当前使用的账号
    const markedAccountList = accountList.map(acc => ({
      ...acc,
      isCurrent: acc.accountId === currentAccountId
    }));
    
    this.setData({ accountList: markedAccountList });
  },

  // 选择账号
  selectAccount(e) {
    const account = e.currentTarget.dataset.account;
    
    if (account.isCurrent) {
      wx.showToast({
        title: '已经是当前账号',
        icon: 'none'
      });
      return;
    }
    
    // 更新当前账号标记
    const accountList = this.data.accountList.map(acc => ({
      ...acc,
      isCurrent: acc.accountId === account.accountId
    }));
    
    // 保存到本地存储
    wx.setStorageSync('accountList', accountList);
    wx.setStorageSync('userInfo', account);
    wx.setStorageSync('currentAccountId', account.accountId);
    app.globalData.userInfo = account;
    
    wx.showToast({
      title: '切换成功',
      icon: 'success',
      success: () => {
        setTimeout(() => {
          // 跳转到首页
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }, 1500);
      }
    });
  },

  // 创建新账号
  createNewAccount() {
    wx.navigateTo({
      url: '/pages/login/login?action=create'
    });
  },

  // 编辑账号
  editAccount(e) {
    const account = e.currentTarget.dataset.account;
    wx.navigateTo({
      url: `/pages/login/login?action=edit&accountId=${account.accountId}`
    });
  },

  // 返回
  goBack() {
    // 直接返回到首页
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
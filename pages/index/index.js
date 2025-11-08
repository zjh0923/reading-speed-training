// index.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    maxAllowedDay: 1,  // 允许的最大训练天数
    timer: null,       // 定时器ID
    currentAccountId: '' // 当前账号ID
  },

  // 生命周期函数 - 加载页面
  onLoad() {
    this.loadCurrentAccount();
    this.setupTimer();
  },

  // 生命周期函数 - 页面显示
  onShow() {
    // 每次页面显示时重新加载当前账号信息
    this.loadCurrentAccount();
  },

  // 生命周期函数 - 页面卸载
  onUnload() {
    // 清除定时器
    if (this.data.timer) clearInterval(this.data.timer);
  },

  // 加载当前账号信息
  loadCurrentAccount() {
    const currentAccountId = wx.getStorageSync('currentAccountId');
    const accountList = wx.getStorageSync('accountList') || [];
    const currentAccount = accountList.find(acc => acc.accountId === currentAccountId);
    
    if (currentAccount) {
      this.setData({ 
        userInfo: currentAccount,
        currentAccountId: currentAccountId
      });
      this.calculateMaxDay();
    } else {
      // 如果没有找到当前账号，跳转到登录页面
      this.redirectToLogin();
    }
  },

  // 设置定时器
  setupTimer() {
    // 设置定时器每小时更新一次
    this.setData({
      timer: setInterval(() => {
        this.calculateMaxDay();
      }, 3600000) // 1小时检查一次
    });
  },

  // 跳转到登录页面
  redirectToLogin() {
    wx.showModal({
      title: '提示',
      content: '未找到用户信息，请先登录',
      showCancel: false,
      success: () => {
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }
    });
  },

  // 计算允许的最大Day
  calculateMaxDay() {
    const userInfo = this.data.userInfo;
    if (!userInfo || !userInfo.createTime) {
      this.setData({ maxAllowedDay: 1 });
      return;
    }

    // 获取注册时间和当前时间
    const registerTime = new Date(userInfo.createTime).getTime();
    const currentTime = Date.now();
    
    // 计算经过的小时数
    const passedHours = (currentTime - registerTime) / (1000 * 3600);
    
    // 每12小时开放一个Day（注册后立即开放Day1，12小时后开放Day2，以此类推）
    const maxAllowedDay = Math.min(12, Math.floor(passedHours / 12) + 1);

    // 更新数据（只有变化时才触发渲染）
    if (maxAllowedDay !== this.data.maxAllowedDay) {
      this.setData({ maxAllowedDay });
      console.log(`账号 ${userInfo.name} 当前开放到 Day${maxAllowedDay}`);
    }
  },

  // 跳转到训练页面
  async goToTrain(e) {
    const day = parseInt(e.currentTarget.dataset.day);
    const userInfo = this.data.userInfo;

    // 检查是否已超过允许的Day
    if (day > this.data.maxAllowedDay) {
      wx.showToast({ 
        title: `Day${day} 未到开放时间`, 
        icon: 'none',
        duration: 2000
      });
      return;
    }

  // 检查是否已完成该Day训练
  try {
    const db = wx.cloud.database();
    const res = await db.collection('trainHistory').where({
      accountId: this.data.currentAccountId, // 使用当前账号ID
      day: day
    }).count();

      if (res.total > 0) {
        wx.showToast({ 
          title: '已完成该训练', 
          icon: 'none',
          duration: 2000
        });
      } else {
        // 根据组别跳转到不同的训练页面
        const urlMap = {
          '1': '/pages/train1-1/train1-1',
          '2': '/pages/train2-1/train2-1', 
          '3': '/pages/train3-1/train3-1',
          '4': '/pages/train4-1/train4-1',
        };
        
        const trainPage = urlMap[userInfo.group] || '/pages/train1-1/train1-1';
        wx.navigateTo({
          url: `${trainPage}?day=${day}&grade=${userInfo.grade}&group=${userInfo.group}&accountId=${this.data.currentAccountId}`
        });
      }
    } catch (err) {
      console.error('检查记录失败:', err);
      // 网络异常时，检查本地存储
      const localHistory = wx.getStorageSync('trainHistory') || [];
      const hasLocalRecord = localHistory.some(record => 
        record.day === day && record.accountId === this.data.currentAccountId
      );
      
      if (hasLocalRecord) {
        wx.showToast({ 
          title: '已完成该训练', 
          icon: 'none',
          duration: 2000
        });
      } else {
        // 允许进入训练（离线模式）
        const urlMap = {
          '1': '/pages/train1-1/train1-1',
          '2': '/pages/train2-1/train2-1', 
          '3': '/pages/train3-1/train3-1',
          '4': '/pages/train4-1/train4-1',
        };
        
        const trainPage = urlMap[userInfo.group] || '/pages/train1-1/train1-1';
        wx.navigateTo({
          url: `${trainPage}?day=${day}&grade=${userInfo.grade}&group=${userInfo.group}&accountId=${this.data.currentAccountId}`
        });
      }
    }
  },

  // 分享功能
  onShareAppMessage() {
    const userName = this.data.userInfo ? this.data.userInfo.name : '我';
    return {
      title: `${userName}正在使用阅读训练小程序，快来一起学习吧！`,
      path: '/pages/index/index',
      imageUrl: '/images/index/jing.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const userName = this.data.userInfo ? this.data.userInfo.name : '我';
    return {
      title: `${userName}的阅读训练记录`,
      imageUrl: '/images/index/jing.png'
    };
  }
});
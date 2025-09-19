// index.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    maxAllowedDay: 1,  // 允许的最大训练天数
    timer: null        // 定时器ID
  },

  // 生命周期函数 - 加载页面
  onLoad() {
    // 从全局或本地获取用户信息
    const globalUser = app.globalData.userInfo;
    const storageUser = wx.getStorageSync('userInfo');
    this.setData({ userInfo: globalUser || storageUser || {} });

    // 初始计算允许的最大Day
    this.calculateMaxDay();

    // 设置定时器每分钟更新一次
    this.setData({
      timer: setInterval(() => {
        this.calculateMaxDay();
      },3600000) // 1h检查一次
    });
  },

  // 生命周期函数 - 页面卸载
  onUnload() {
    // 清除定时器
    if (this.data.timer) clearInterval(this.data.timer);
  },

 // 计算允许的最大Day（关键修改）
 calculateMaxDay() {
  const userInfo = this.data.userInfo;
  if (!userInfo || !userInfo.createTime) {
    this.setData({ maxAllowedDay: 1 });
    return;
  }

  // 计算注册时间到当前的完整天数
  const registerTime = new Date(userInfo.createTime).getTime();
  const currentTime = Date.now();
  const passedDays = Math.floor((currentTime - registerTime) / (1000 * 3600 * 24));

  // 每1天开放一个Day（注册当天为Day1）
  const maxAllowedDay = Math.min(12, passedDays + 1);

  // 更新数据（只有变化时才触发渲染）
  if (maxAllowedDay !== this.data.maxAllowedDay) {
    this.setData({ maxAllowedDay });
    console.log(`当前开放到 Day${maxAllowedDay}`);
  }
},
  // 跳转到训练页面
  goToTrain(e) {
    const day = parseInt(e.currentTarget.dataset.day);
    const app = getApp();
    const userInfo = app.globalData.userInfo;

    // 检查是否已超过允许的Day
    if (day > this.data.maxAllowedDay) {
      wx.showToast({ title: '未到开放时间', icon: 'none' });
      return;
    }

    // 检查是否已完成该Day训练（原有逻辑）
    const db = wx.cloud.database();
    db.collection('trainHistory').where({
      _openid: wx.getStorageSync('openid'),
      day: day
    }).count().then(res => {
      if (res.total > 0) {
        wx.showToast({ title: '已完成该训练', icon: 'none' });
      } else {
        const urlMap = {
          '1': '/pages/train1-1/train1-1',
          '2': '/pages/train2-1/train2-1', 
          '3': '/pages/train3-1/train3-1'
        };
        wx.navigateTo({
          url: `${urlMap[userInfo.group]}?day=${day}&grade=${userInfo.grade}&group=${userInfo.group}`
        });
      }
    }).catch(err => {
      console.error('检查记录失败:', err);
      wx.showToast({ title: '网络异常', icon: 'none' });
    });
  },

  // 分享功能（原有逻辑）
  onShareAppMessage() {
    return {
      title: '快来和我一起学习吧！',
      path: '/pages/index/index',
      imageUrl: '/images/index/jing.png'
    };
  },

  // 朋友圈分享（原有逻辑）
  onShareTimeline() {
    return {
      title: '每日学习打卡，坚持就是胜利！',
      query: 'from=timeline',
      imageUrl: '/images/index/jing.png'
    };
  }
});
// pages/train-records/train-records.js
const app = getApp();

Page({
  data: {
    records: [],
    stats: {
      totalTrainings: 0,
      totalDuration: '0.0',
      averageSpeed: '0',
      accuracy: '0.0'
    },
    hasLocalData: false,
    isLoading: true,
  },

  onLoad() {
    this.loadData();
    this.checkPendingRecords();
  },

  onShow() {
    if (wx.getStorageSync('shouldRefreshRecords')) {
      wx.removeStorageSync('shouldRefreshRecords');
      this.loadData();
    }
  },

  async loadData() {
    wx.showLoading({
      title: '加载历史记录...',
      mask: true
    });

    try {
      const cloudData = await this.getCloudData();
      const localData = wx.getStorageSync('trainHistory') || [];
      
      const allData = this.mergeData(cloudData, localData);
      this.processData(allData);  // 移除了 initChart 调用
      
      wx.setStorageSync('trainHistory', allData);
      this.setData({ isLoading: false });

    } catch (error) {
      console.error('数据加载失败:', error);
      this.fallbackToLocalData();
    } finally {
      wx.hideLoading();
    }
  },

  async getCloudData() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('trainHistory')
        .orderBy('timestamp', 'desc')
        .get();
      return res.data;
    } catch (error) {
      console.warn('云端数据获取失败，使用本地缓存');
      return [];
    }
  },

  mergeData(cloudData, localData) {
    const cloudTimestamps = new Set(cloudData.map(d => d.timestamp));
    return [
      ...cloudData,
      ...localData.filter(d => !cloudTimestamps.has(d.timestamp))
    ].sort((a, b) => b.timestamp - a.timestamp);
  },

  fallbackToLocalData() {
    const localData = wx.getStorageSync('trainHistory') || [];
    console.log('本地缓存数据:', localData);
    this.processData(localData);
    this.setData({ isLoading: false });
    
    wx.showToast({
      title: '网络异常，使用本地数据',
      icon: 'none',
      duration: 2000
    });
  },

  processData(history) {
    const completedHistory = history.filter(item => 
      item.completed !== false
    );
    
    const stats = completedHistory.reduce((acc, curr) => ({
      totalDuration: acc.totalDuration + curr.duration,
      totalSpeed: acc.totalSpeed + curr.speed,
      totalAccuracy: acc.totalAccuracy + curr.accuracy,
      totalTrainings: acc.totalTrainings + 1
    }), {
      totalDuration: 0,
      totalSpeed: 0,
      totalAccuracy: 0,
      totalTrainings: 0
    });

    this.setData({
      records: completedHistory.map(item => ({
        ...item,
        date: this.formatDate(item.timestamp),
        duration: item.duration.toFixed(1),
        accuracy: item.accuracy.toFixed(1) + '%'
      })),
      stats: {
        totalTrainings: stats.totalTrainings,
        totalDuration: stats.totalDuration.toFixed(1),
        averageSpeed: stats.totalTrainings > 0 
          ? (stats.totalSpeed / stats.totalTrainings).toFixed(0)
          : '0',
        accuracy: stats.totalTrainings > 0
          ? (stats.totalAccuracy / stats.totalTrainings).toFixed(1) + '%'
          : '0.0%'
      },
    });
  },

  checkPendingRecords() {
    const pending = wx.getStorageSync('pendingRecords') || [];
    this.setData({ hasLocalData: pending.length > 0 });
  },

  async syncLocalData() {
    const pending = wx.getStorageSync('pendingRecords') || [];
    if (pending.length === 0) return;

    wx.showLoading({ title: `同步${pending.length}条记录...` });
    
    try {
      for (const record of pending) {
        await wx.cloud.callFunction({
          name: 'saveTrainRecord',
          data: record
        });
      }
      
      wx.setStorageSync('pendingRecords', []);
      this.setData({ hasLocalData: false });
      this.loadData();
      
      wx.showToast({
        title: '同步成功',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: '我的阅读训练记录',
      path: '/pages/train-records/train-records'
    };
  }
});
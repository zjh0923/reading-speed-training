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
    currentAccountId: ''
  },

  onLoad() {
    const currentAccountId = wx.getStorageSync('currentAccountId');
    this.setData({ currentAccountId });
    console.log('训练记录页面 - 当前账号ID:', currentAccountId);

    this.loadData();
    this.checkPendingRecords();
  },

  onShow() {
    const newAccountId = wx.getStorageSync('currentAccountId');
    if (newAccountId !== this.data.currentAccountId) {
      this.setData({ currentAccountId: newAccountId });
      this.loadData();
    } else if (wx.getStorageSync('shouldRefreshRecords')) {
      wx.removeStorageSync('shouldRefreshRecords');
      this.loadData();
    }
  },

  // ✅ 修正版：自动去重的加载逻辑
  async loadData() {
    wx.showLoading({ title: '加载历史记录...', mask: true });

    try {
      const currentAccountId = this.data.currentAccountId;
      if (!currentAccountId) throw new Error('未找到当前账号信息');

      const cloudData = await this.getCloudData(currentAccountId);
      const allLocalData = wx.getStorageSync('trainHistory') || [];

      // 当前账号的本地数据
      const localData = allLocalData.filter(i => i.accountId === currentAccountId);

      // 合并 + 去重
      const merged = this.mergeData(cloudData, localData);

      // 二次严格去重（按 recordId + timestamp）
      const unique = [];
      const seen = new Set();
      for (const r of merged) {
        const key = r.recordId || `${r.accountId}_${new Date(r.timestamp).getTime()}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(r);
        }
      }

      // 替换当前账号的本地数据
      const updatedAll = allLocalData
        .filter(i => i.accountId !== currentAccountId)
        .concat(unique);
      wx.setStorageSync('trainHistory', updatedAll);

      this.processData(unique);
      this.setData({ isLoading: false });

      console.log('✅ 数据加载完成，本地记录数：', unique.length);
    } catch (error) {
      console.error('数据加载失败:', error);
      this.fallbackToLocalData();
    } finally {
      wx.hideLoading();
    }
  },

  // ✅ 修正版：稳定去重的合并逻辑
  mergeData(cloudData, localData) {
    const normalize = d => {
      let t = d.timestamp;
      if (t instanceof Date) t = t.getTime();
      else if (typeof t === 'string') t = new Date(t).getTime();
      else if (typeof t !== 'number') t = 0;

      const id = d.recordId || `${d.accountId || 'unknown'}_${t || ''}`;
      return { id, time: t };
    };

    const cloudKeys = new Set(cloudData.map(d => normalize(d).id));

    const merged = [
      ...cloudData,
      ...localData.filter(d => !cloudKeys.has(normalize(d).id))
    ];

    merged.sort((a, b) => normalize(b).time - normalize(a).time);

    console.log('🔍 mergeData 后合并记录数:', merged.length);
    return merged;
  },

  // 云端数据加载
  async getCloudData(currentAccountId) {
    try {
      const db = wx.cloud.database();
      console.log('从云数据库获取数据，账号ID:', currentAccountId);

      const res = await db
        .collection('trainHistory')
        .where({ accountId: currentAccountId })
        .orderBy('timestamp', 'desc')
        .get();

      console.log('云数据库返回数据:', res.data);
      return res.data;
    } catch (error) {
      console.warn('云端数据获取失败，使用本地缓存:', error);
      return [];
    }
  },

  fallbackToLocalData() {
    const allLocalData = wx.getStorageSync('trainHistory') || [];
    const currentAccountLocalData = allLocalData.filter(
      item => item.accountId === this.data.currentAccountId
    );

    console.log('当前账号本地缓存数据:', currentAccountLocalData);
    this.processData(currentAccountLocalData);
    this.setData({ isLoading: false });

    wx.showToast({
      title: '网络异常，使用本地数据',
      icon: 'none',
      duration: 2000
    });
  },

  processData(history) {
    const completedHistory = history.filter(
      item => item.completed !== false && item.accountId === this.data.currentAccountId
    );

    console.log('处理后的训练记录:', completedHistory);

    const stats = completedHistory.reduce(
      (acc, curr) => ({
        totalDuration: acc.totalDuration + (curr.duration || 0),
        totalSpeed: acc.totalSpeed + (curr.speed || 0),
        totalAccuracy: acc.totalAccuracy + (curr.accuracy || 0),
        totalTrainings: acc.totalTrainings + 1
      }),
      {
        totalDuration: 0,
        totalSpeed: 0,
        totalAccuracy: 0,
        totalTrainings: 0
      }
    );

    this.setData({
      records: completedHistory.map(item => ({
        ...item,
        date: this.formatDate(item.timestamp),
        duration: (item.duration || 0).toFixed(1),
        accuracy: (item.accuracy || 0).toFixed(1) + '%',
        speed: item.speed || 0
      })),
      stats: {
        totalTrainings: stats.totalTrainings,
        totalDuration: stats.totalDuration.toFixed(1),
        averageSpeed:
          stats.totalTrainings > 0
            ? (stats.totalSpeed / stats.totalTrainings).toFixed(0)
            : '0',
        accuracy:
          stats.totalTrainings > 0
            ? (stats.totalAccuracy / stats.totalTrainings).toFixed(1) + '%'
            : '0.0%'
      }
    });
  },

  checkPendingRecords() {
    const allPending = wx.getStorageSync('pendingRecords') || [];
    const currentAccountPending = allPending.filter(
      record => record.accountId === this.data.currentAccountId
    );
    this.setData({ hasLocalData: currentAccountPending.length > 0 });
  },

  async syncLocalData() {
    const allPending = wx.getStorageSync('pendingRecords') || [];
    const currentAccountPending = allPending.filter(
      record => record.accountId === this.data.currentAccountId
    );

    if (currentAccountPending.length === 0) {
      wx.showToast({ title: '没有需要同步的记录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: `同步${currentAccountPending.length}条记录...` });

    try {
      let successCount = 0;
      let failCount = 0;
      const db = wx.cloud.database();

      for (const record of currentAccountPending) {
        try {
          await db.collection('trainHistory').add({
            data: {
              ...record,
              timestamp: new Date(record.timestamp)
            }
          });
          successCount++;
        } catch (error) {
          console.error('同步单条记录失败:', error);
          failCount++;
        }
      }

      // 移除已同步成功的
      const updatedPending = allPending.filter(
        record =>
          !currentAccountPending.find(
            p =>
              p.day === record.day &&
              p.accountId === record.accountId &&
              p.timestamp === record.timestamp
          )
      );

      wx.setStorageSync('pendingRecords', updatedPending);
      this.setData({ hasLocalData: updatedPending.length > 0 });
      this.loadData();

      if (failCount > 0) {
        wx.showToast({
          title: `同步完成，成功${successCount}条，失败${failCount}条`,
          icon: 'none',
          duration: 3000
        });
      } else {
        wx.showToast({ title: '同步成功', icon: 'success' });
      }
    } catch (error) {
      console.error('同步失败:', error);
      wx.showToast({ title: '同步失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  formatDate(timestamp) {
    if (!timestamp) return '未知时间';
    let date;
    if (timestamp instanceof Date) date = timestamp;
    else if (typeof timestamp === 'number') date = new Date(timestamp);
    else if (typeof timestamp === 'string') date = new Date(timestamp);
    else return '时间格式错误';
    if (isNaN(date.getTime())) return '无效时间';

    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date
      .getDate()
      .toString()
      .padStart(2, '0')} ${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    const userInfo = app.globalData.userInfo || {};
    return {
      title: `${userInfo.name || '我'}的阅读训练记录`,
      path: '/pages/train-records/train-records'
    };
  },

  clearLocalData() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空本地训练记录缓存吗？',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('trainHistory');
          wx.removeStorageSync('pendingRecords');
          this.setData({
            records: [],
            stats: {
              totalTrainings: 0,
              totalDuration: '0.0',
              averageSpeed: '0',
              accuracy: '0.0%'
            },
            hasLocalData: false
          });
          wx.showToast({ title: '缓存已清空', icon: 'success' });
        }
      }
    });
  }
});

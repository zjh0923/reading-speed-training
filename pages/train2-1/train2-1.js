// pages/train/train.js
const app = getApp(); 
import { grade3Materials } from '../materials/grade3-materials';
import { grade4Materials } from '../materials/grade4-materials';
import { grade5Materials } from '../materials/grade5-materials';

// 云开发保存最大重试次数
const CLOUD_SAVE_MAX_RETRIES = 3;

Page({
  data: {
    // 状态控制
    showCountdown: true,
    showPhaseTip: false,
    showFirstFixation: false,
    showBlankScreen: false,
    showSentence: false,
    showQuestions: false,
    showFeedback: false,
    showStats: false,
    showContinueTip: false,
    saveFailed: false, // 新增：保存失败状态
    
    // 统计数据
    statsData: {
      totalTime: 0,
      correctCount: 0,
      incorrectCount: 0,
      accuracy: 0,
      minDuration: 0,
      correctSpeed: 0,
      currentDay: 1
    },
    
    // 实验参数
    isPractice: true,
    phaseTipText: "",
    countdown: 3,
    durationPerWord: 200,
    correctStreak: 0,
    minDuration: 200,

    // 文字显示
    displaySentence: "",
    wordArray: [],
    hiddenWordIndex: -1,

    // 时间记录
    sentenceStartTime: 0,
    readingDuration: 0,

    // 统计数据
    startTime: 0,
    totalTime: 0,
    correctCount: 0,
    incorrectCount: 0,
    practiceValidDurations: [],

    // 当前数据
    currentDay: 1,
    currentTrial: 0,
    currentQuestion: {},
    feedbackSymbol: "",
    statsText: "",

    // 实验材料
    practiceTrials: [],
    trials: [],
    
    // 新增：云开发保存重试次数
    cloudSaveRetries: 0,

    // 新增：当前训练记录数据（用于重试）
    currentRecordData: null,
    showHiddenSentence: false,
    firstChar: '',
    restChars: '',
    fixationLeft: 0,
    fixationTop: 0,
    accountId: '', // 确保 accountId 
    feedbackClass: "",
  },

  // 生命周期函数，从 URL 参数获取 day（训练天数）和 grade（年级），调用 initTraining 初始化训练
  onLoad(options) {
    const day = parseInt(options.day) || 1;
    const grade = options.grade || '3';
    const accountId = options.accountId || wx.getStorageSync('currentAccountId');
    
    // 确保 accountId 被正确设置
    this.setData({ 
      accountId: accountId,
      currentDay: day,
      grade: grade
    });
    
    console.log('训练页面加载 - 账号ID:', accountId, '训练天数:', day, '年级:', grade);
    
    // 检查是否有缓存的训练进度
  // 修复：使用正确的缓存键
    const progressKey = `trainProgress_${accountId}`;
    const cachedProgress = wx.getStorageSync(progressKey);
    console.log('缓存检查结果:', {
      有缓存: !!cachedProgress,
      相同训练: isSameTraining,
      缓存内容: cachedProgress
    });
    const isSameTraining = cachedProgress && 
                          cachedProgress.day === day && 
                          cachedProgress.grade === grade &&
                          cachedProgress.accountId === accountId; // 添加 accountId 检查
    
    if (isSameTraining) {
      // 询问用户是否恢复训练
      wx.showModal({
        title: '恢复训练',
        content: '检测到未完成的训练，是否恢复？',
        success: (res) => {
          if (res.confirm) {
            this.restoreTraining(cachedProgress);
          } else {
            // 清除缓存并开始新训练
            this.cleanTrainingData(day, grade, accountId);
            this.initTraining(day, grade, accountId);
          }
        }
      });
    } else {
      // 清除可能存在的旧数据并开始新训练
      this.cleanTrainingData(day, grade, accountId);
      this.initTraining(day, grade, accountId);
    }
  },
  
  onUnload() {
    // 页面卸载时保存训练进度
    this.saveTrainingProgress();
  },
  
  onHide() {
    // 页面隐藏时保存训练进度
    this.saveTrainingProgress();
  },

  // 清理训练数据
  cleanTrainingData(day, grade, accountId) {
    // 清除训练进度缓存（基于账号）
    const progressKey = `trainProgress_${accountId}`;
    wx.removeStorageSync(progressKey);
    
    // 清除可能存在的旧的速度数据（只保留已完成的天数）
    const allKeys = wx.getStorageInfoSync().keys;
    allKeys.forEach(key => {
      if (key.startsWith(`lastCorrectSpeed_day${day}_${accountId}`) && parseInt(key.split('_')[2]) >= day) {
        wx.removeStorageSync(key);
      }
    });
  },

  // 保存训练进度
  saveTrainingProgress() {
    if (this.data.showStats) return; // 训练已完成，不需要保存进度
    
    const progress = {
      day: this.data.currentDay,
      grade: this.data.grade,
      accountId: this.data.accountId, // 保存 accountId
      isPractice: this.data.isPractice,
      currentTrial: this.data.currentTrial,
      correctCount: this.data.correctCount,
      incorrectCount: this.data.incorrectCount,
      durationPerWord: this.data.durationPerWord,
      correctStreak: this.data.correctStreak,
      minDuration: this.data.minDuration,
      practiceValidDurations: this.data.practiceValidDurations,
      startTime: this.data.startTime
    };
    
    // 使用账号特定的存储键
    const progressKey = `trainProgress_${this.data.accountId}`;
    wx.setStorageSync(progressKey, progress);
  },

  // 恢复训练
 // 恢复训练
restoreTraining(progress) {
  const day = progress.day;
  const grade = progress.grade;
  
  // 获取材料
  let materials;
  switch(grade) {
    case '3': materials = grade3Materials; break;
    case '4': materials = grade4Materials; break;
    case '5': materials = grade5Materials; break;
    default: materials = grade3Materials;
  }

  const dayData = materials[day] || {};
  
  this.setData({
    currentDay: day,
    grade: grade,
    accountId: progress.accountId, // 恢复 accountId
    isPractice: progress.isPractice,
    practiceTrials: dayData.practice || [],
    trials: dayData.formal || [],
    currentTrial: progress.currentTrial,
    correctCount: progress.correctCount,
    incorrectCount: progress.incorrectCount,
    durationPerWord: progress.durationPerWord,
    correctStreak: progress.correctStreak,
    minDuration: progress.minDuration,
    practiceValidDurations: progress.practiceValidDurations,
    startTime: progress.startTime,
    showCountdown: false
  });

  // 根据当前状态继续训练
  if (this.data.currentTrial === 0) {
    // 如果是第一个 trial，显示规则说明
    this.setData({
      showPhaseTip: true
    });
  } else {
    this.startTrial();
  }
},

  // 初始化训练
  initTraining(day, grade, accountId) {
    // 获取材料
    let materials;
    switch(grade) {
      case '3': materials = grade3Materials; break;
      case '4': materials = grade4Materials; break;
      case '5': materials = grade5Materials; break;
      default: materials = grade3Materials;
    }

    const dayData = materials[day] || {};
    const isDay1 = day === 1;
    
    // 获取初始速度（基于账号）
    let initialSpeed = 200;
    if (day === 1) {
      const practiceSpeedKey = `practiceCorrectSpeed_${accountId}`;
      initialSpeed = wx.getStorageSync(practiceSpeedKey) || 200;
    } else {
      // 尝试获取前一天的速度（基于账号）
      const prevDayKey = `lastCorrectSpeed_day${day-1}_${accountId}`;
      initialSpeed = wx.getStorageSync(prevDayKey) || 200;
      
      // 如果没有找到前一天的速度，尝试获取更早的
      if (initialSpeed === 200 && day > 2) {
        for (let i = day-2; i >= 1; i--) {
          const testKey = `lastCorrectSpeed_day${i}_${accountId}`;
          const testSpeed = wx.getStorageSync(testKey);
          if (testSpeed) {
            initialSpeed = testSpeed;
            break;
          }
        }
      }
    }

    this.setData({
      currentDay: day,
      grade: grade,
      accountId: accountId, // 确保 accountId 被设置
      isPractice: isDay1,
      practiceTrials: dayData.practice || [],
      trials: dayData.formal || [],
      durationPerWord: initialSpeed,
      correctStreak: 0,
      minDuration: initialSpeed,
      practiceValidDurations: [],
      startTime: Date.now(),
      correctCount: 0,
      incorrectCount: 0,
      currentTrial: 0,
      countdown: 3,
      showCountdown: true,
      cloudSaveRetries: 0,
      currentRecordData: null
    });

    this.startCountdown();
  },

  // 倒计时与阶段切换
  startCountdown() {
    const timer = setInterval(() => {
      if (this.data.countdown > 1) {
        this.setData({ countdown: this.data.countdown - 1 });
      } else {
        clearInterval(timer);
        this.startPracticePhase();
      }
    }, 1000);
  },

  // 练习阶段
startPracticePhase() {
  if (!this.data.isPractice) {
    this.setData({
      showCountdown: false,
      showPhaseTip: true,
      phaseTipText: `Day${this.data.currentDay}训练\n初始速度: ${this.data.durationPerWord}ms/词`
    });
    return;
  }

  // 练习阶段只需要设置显示标志，内容已经在 WXML 中写死
  this.setData({ 
    showCountdown: false,
    showPhaseTip: true
  });
},

handleStartPractice() {
  if (this.data.showPhaseTip) {
    this.setData({ 
      showPhaseTip: false 
    });
    
    // 无论是练习阶段还是正式阶段，都开始第一个trial
    this.startTrial();
  }
},

  // 题目流程

 startTrial() {
  // 如果已经在显示注视点或句子，直接返回
  if (this._trialStarting || this.data.showFirstFixation || this.data.showSentence) {
    console.warn('[防重复] startTrial 已在执行中，跳过');
    return;
  }

  this._trialStarting = true;
  this._fixationLock = true;

  const trials = this.data.isPractice ? this.data.practiceTrials : this.data.trials;
  const trialIndex = this.data.currentTrial;

  // 超出范围 => 进入下一阶段
  if (trialIndex >= trials.length) {
    this._trialStarting = false;
    this._fixationLock = false;
    return this.data.isPractice ? this.startFormalTraining() : this.showFinalStats();
  }

  const currentTrial = trials[trialIndex];
  const sentenceRaw = (currentTrial.sentence || "").trim();
  
  // 👉 采用版本1的句子处理逻辑：区分练习/正式阶段
  const sentenceForFixation = this.data.isPractice 
    ? sentenceRaw.replace(/ /g, "")   // 练习：无空格
    : sentenceRaw;                     // 正式：保留空格

  // 清理旧状态
  this.setData({
    showHiddenSentence: true,
    showFirstFixation: false,
    showSentence: false,
    // 修复：设置练习阶段的句子内容
    displaySentence: this.data.isPractice ? sentenceRaw.replace(/ /g, "") : "",
    firstChar: sentenceForFixation.charAt(0) || '',
    restChars: sentenceForFixation.slice(1) || ''
  });

  // 清除可能遗留的定时器
  if (this._selectorQueryTimer) clearTimeout(this._selectorQueryTimer);
  if (this._fixationTimer) clearTimeout(this._fixationTimer);

  // 延时测量文字位置
  this._selectorQueryTimer = setTimeout(() => {
    if (!this._fixationLock) {
      console.warn('[防重复] fixationLock 已解除，取消注视点');
      this._trialStarting = false;
      return;
    }

    const that = this;
    wx.createSelectorQuery()
      .in(that)
      .select('#firstChar')
      .boundingClientRect(rect => {
        let fixationLeft, fixationTop;
        if (rect) {
          // 👉 采用版本1的注视点定位逻辑
          fixationLeft = rect.left + rect.width / 2;
          // rect.top 是字符上边缘
          fixationTop = rect.top + rect.height * 0.4; // 根据实际视觉调整
        } else {
          // 测量失败兜底：屏幕中心
          const winInfo = wx.getWindowInfo();
          fixationLeft = winInfo.windowWidth / 2;
          fixationTop = winInfo.windowHeight / 2;
        }

        // 第一次显示 +
        that.setData({
          fixationLeft,
          fixationTop,
          showHiddenSentence: false,
          showFirstFixation: true,
          showSentence: false
        });

        // 延时 500ms 后显示句子
        that._fixationTimer = setTimeout(() => {
          // 二次确认：如果页面状态已改变，不重复显示
          if (!that.data.showFirstFixation) {
            console.warn('[防重复] 注视点已消失，跳过句子显示');
            that._trialStarting = false;
            that._fixationLock = false;
            return;
          }

          that.setData({
            showFirstFixation: false,
            showSentence: true,
            // 修复：确保练习阶段显示点击提示
            showContinueTip: that.data.isPractice
          });

          // 释放锁
          that._fixationLock = false;
          that._trialStarting = false;

          // 记录时间
          that.data.sentenceStartTime = Date.now();

          // 如果是正式阶段，启动消词流程
          if (!that.data.isPractice) {
            const wordArray = sentenceRaw.split(" ");
            that.setData({
              wordArray,
              hiddenWordIndex: -1
            });
            that.startWordDisappear();
          }
          // 练习阶段不需要额外操作，等待用户点击
        }, 500);
      })
      .exec();
  }, 50);
},

  

  transitionToQuestion() {
    this.setData({ showSentence: false });
    setTimeout(() => {
      this.presentQuestion();
    }, 200);
  },

  showSentence() {
    const trials = this.data.isPractice ? this.data.practiceTrials : this.data.trials;
    const sentence = trials[this.data.currentTrial].sentence;

    this.setData({ 
      sentenceStartTime: Date.now(),
      displaySentence: sentence.replace(/ /g, "")
    });

    if (this.data.isPractice) {
      this.setData({
        showSentence: true,
        showContinueTip: true
      });
    } else {
      const wordArray = sentence.split(" ");
      this.setData({
        showSentence: true,
        wordArray: wordArray,
        hiddenWordIndex: -1
      });
      this.startWordDisappear();
    }
  },

  startWordDisappear() {
    const that = this;
    if (this.wordTimer) clearInterval(this.wordTimer);
    
    this.wordTimer = setInterval(function() {
      if (that.data.hiddenWordIndex < that.data.wordArray.length - 1) {
        that.setData({ hiddenWordIndex: that.data.hiddenWordIndex + 1 });
      } else {
        clearInterval(that.wordTimer);
        that.transitionToQuestion();
      }
    }, this.data.durationPerWord);
  },

  handleTap() {
    if (this.data.isPractice && this.data.showContinueTip) {
      const readingDuration = Date.now() - this.data.sentenceStartTime;
      
      this.setData({ 
        showSentence: false,
        showContinueTip: false,
        showBlankScreen: true 
      });

      setTimeout(() => {
        this.presentQuestion();
        this.data.readingDuration = readingDuration;
      }, 200);
    }
  },

  presentQuestion() {
    const trials = this.data.isPractice ? this.data.practiceTrials : this.data.trials;
    
    this.setData({
      showBlankScreen: false,
      showQuestions: true,
      currentQuestion: trials[this.data.currentTrial]
    });
  },

  handleAnswer(e) {
    const trials = this.data.isPractice ? this.data.practiceTrials : this.data.trials;
    const selected = e.currentTarget.dataset.index;
    const currentTrial = trials[this.data.currentTrial];
    const isCorrect = selected == currentTrial.correct;
    const correctAnswer = currentTrial.options[currentTrial.correct];

    if (this.data.isPractice) {
      if (isCorrect) {
        const wordCount = currentTrial.sentence.split(" ").length;
        this.data.practiceValidDurations.push({
          duration: this.data.readingDuration,
          wordCount: wordCount
        });
      }
    } else {
      this.setData({
        correctCount: this.data.correctCount + (isCorrect ? 1 : 0),
        incorrectCount: this.data.incorrectCount + (isCorrect ? 0 : 1)
      });
      if (isCorrect) {
        currentTrial.correctDuration = this.data.durationPerWord;
      }
      this.adjustSpeed(isCorrect);
    }

    this.showFeedback(isCorrect, correctAnswer);
  },

  adjustSpeed(isCorrect) {
    let { correctStreak, durationPerWord, minDuration } = this.data;

    if (isCorrect) {
      correctStreak++;
      if (correctStreak >= 3) {
        durationPerWord = Math.max(80, durationPerWord - 6);
        correctStreak = 0;
      }
    } else {
      durationPerWord += 6;
      correctStreak = 0;
    }

    this.setData({ 
      correctStreak, 
      durationPerWord,
      minDuration: Math.min(minDuration, durationPerWord)
    });
  },

  showFeedback(isCorrect, correctAnswer) {
    let feedbackSymbol;
    let feedbackText = "";
    let feedbackClass = "";
    let duration = 500;

    if (isCorrect) {
      feedbackSymbol = "正确";
      duration = 500;
    } else {
      feedbackSymbol = "错误";
      feedbackText = `正确答案：${correctAnswer}`;
      duration = 1500;
    }
  
    this.setData({
      showQuestions: false,
      showFeedback: true,
      feedbackSymbol: feedbackSymbol,
      feedbackText: feedbackText,
      feedbackClass: feedbackClass
    });
  
    setTimeout(() => {
      this.setData({ 
        showFeedback: false,
        feedbackClass: ""  // 清除样式类
      });
      setTimeout(() => {
        this.nextTrial();
      }, 200);
    }, duration);
  },

  nextTrial() {
    this.setData({ currentTrial: this.data.currentTrial + 1 });
    // 保存训练进度
    this.saveTrainingProgress();
    this.startTrial();
  },


// 正式训练
startFormalTraining() {
  console.log('开始正式训练');
  
  let practiceSpeed = 200;
  if (this.data.practiceValidDurations.length > 0) {
    const totalDuration = this.data.practiceValidDurations.reduce((sum, item) => sum + item.duration, 0);
    const totalWords = this.data.practiceValidDurations.reduce((sum, item) => sum + item.wordCount, 0);
    practiceSpeed = Math.round(totalDuration / totalWords);
    console.log('计算出的练习速度:', practiceSpeed);
  }

  // 保存练习速度（基于账号）
  const practiceSpeedKey = `practiceCorrectSpeed_${this.data.accountId}`;
  wx.setStorageSync(practiceSpeedKey, practiceSpeed);

  this.setData({
    isPractice: false,
    durationPerWord: practiceSpeed,
    minDuration: practiceSpeed,
    currentTrial: 0,
    showPhaseTip: true,
    phaseTipText: `Day${this.data.currentDay}训练\n初始速度: ${practiceSpeed}ms/词` // 添加提示文本
  });

  console.log('正式训练参数设置完成:', {
    durationPerWord: practiceSpeed,
    trialsCount: this.data.trials.length
  });

  // 保存训练进度
  this.saveTrainingProgress();
  

},


// 显示最终统计
showFinalStats() {
  // 防止重复调用
  if (this._statsLocked) return;
  this._statsLocked = true;

  console.log('开始保存训练记录，当前天数:', this.data.currentDay);

  const totalTime = ((Date.now() - this.data.startTime) / 1000).toFixed(1);
  const totalQuestions = this.data.correctCount + this.data.incorrectCount;
  const accuracy = totalQuestions > 0
    ? (this.data.correctCount / totalQuestions * 100).toFixed(1)
    : 0;

  // 计算正确速度 - 修复可能的计算问题
  let correctSpeed = 0;
  if (!this.data.isPractice && this.data.trials && this.data.trials.length > 0) {
    const correctTrials = this.data.trials.filter(t => t.correctDuration);
    if (correctTrials.length > 0) {
      correctSpeed = Math.round(correctTrials.reduce((sum, t) => sum + t.correctDuration, 0) / correctTrials.length);
    } else {
      // 如果没有正确题目，使用当前速度
      correctSpeed = this.data.durationPerWord;
    }
  } else {
    // 练习阶段或没有材料时使用默认值
    correctSpeed = this.data.durationPerWord;
  }

  console.log('计算出的正确速度:', correctSpeed, '正确题目数:', this.data.correctCount);

  // 保存速度数据（基于账号）
  const dayKey = `lastCorrectSpeed_day${this.data.currentDay}_${this.data.accountId}`;
  wx.setStorageSync(dayKey, correctSpeed);
  console.log('速度数据已保存到本地:', dayKey, '值:', correctSpeed);

  this.setData({
    showStats: true,
    statsData: {
      totalTime,
      correctCount: this.data.correctCount,
      incorrectCount: this.data.incorrectCount,
      accuracy,
      minDuration: this.data.minDuration,
      correctSpeed,
      currentDay: this.data.currentDay
    }
  });

  // 创建更易读的日期时间格式
  const now = new Date();
  const readableDate = now.toISOString().replace('T', ' ').substring(0, 19);
  const dateString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  const recordData = {
    username: app.globalData.userInfo?.name || '未知用户',
    group: app.globalData.userInfo?.group || '未知组别',
    day: this.data.currentDay,
    duration: parseFloat(totalTime),
    speed: correctSpeed,
    accuracy: parseFloat(accuracy),
    timestamp: Date.now(),
    readableDate: readableDate,
    date: dateString,
    time: timeString,
    minSpeed: this.data.minDuration,
    correctCount: this.data.correctCount,
    incorrectCount: this.data.incorrectCount,
    completed: true,
    accountId: this.data.accountId,
    grade: this.data.grade // 添加年级信息
  };

  console.log('准备保存的训练记录:', recordData);

  // 保存到本地历史记录（UPSERT）
  try {
    let history = wx.getStorageSync('trainHistory') || [];
    const key = `${recordData.accountId}_${recordData.day}`;
    const idx = history.findIndex(r => `${r.accountId}_${r.day}` === key);

    if (idx >= 0) {
      history[idx] = recordData;
      console.log('更新本地历史记录');
    } else {
      history.push(recordData);
      console.log('新增本地历史记录');
    }
    wx.setStorageSync('trainHistory', history);
    console.log('本地保存成功，记录数:', history.length);
  } catch (localError) {
    console.error('本地保存失败:', localError);
  }

  // 保存当前记录数据用于可能的重试
  this.setData({ currentRecordData: recordData });

  // 保存到云
  this.saveToCloud(recordData);

  // 清除训练进度缓存
  const progressKey = `trainProgress_${this.data.accountId}`;
  wx.removeStorageSync(progressKey);
  console.log('训练进度缓存已清除');
},
  

// 保存到云开发（带重试机制）
saveToCloud(recordData, retryCount = 0) {
  const db = wx.cloud.database();
  const that = this;

  console.log('正在保存到云数据库，账号ID:', recordData.accountId, '日期:', recordData.readableDate);

  db.collection('trainHistory').add({
    data: {
      ...recordData, // 这样会包含所有字段，包括新的日期字段
      // 或者明确列出所有字段：
      username: recordData.username,
      group: recordData.group,
      day: recordData.day,
      duration: recordData.duration,
      speed: recordData.speed,
      accuracy: recordData.accuracy,
      timestamp: recordData.timestamp,
      readableDate: recordData.readableDate, // 确保这个字段被保存
      date: recordData.date,
      time: recordData.time,
      minSpeed: recordData.minSpeed,
      correctCount: recordData.correctCount,
      incorrectCount: recordData.incorrectCount,
      completed: recordData.completed,
      accountId: recordData.accountId
    },
    success: (res) => {
      console.log('[云数据库] 记录保存成功', res);
      wx.setStorageSync('shouldRefreshRecords', true);
      that.setData({ saveFailed: false });

      // 成功后清理 pendingRecords（UPSERT 删除）
      let pendingRecords = wx.getStorageSync('pendingRecords') || [];
      const key = `${recordData.accountId}_${recordData.day}`;
      pendingRecords = pendingRecords.filter(r => `${r.accountId}_${r.day}` !== key);
      wx.setStorageSync('pendingRecords', pendingRecords);
    },
    fail: (err) => {
      console.error('[云数据库] 保存失败', err);

      if (retryCount < CLOUD_SAVE_MAX_RETRIES) {
        setTimeout(() => {
          that.saveToCloud(recordData, retryCount + 1);
        }, 1000 * (retryCount + 1));
      } else {
        that.setData({
          saveFailed: true,
          cloudSaveRetries: retryCount
        });

        wx.showToast({
          title: '云端保存失败，请检查网络',
          icon: 'none',
          duration: 2000
        });

        // 保存本地 pendingRecords（UPSERT）
        let pendingRecords = wx.getStorageSync('pendingRecords') || [];
        const key = `${recordData.accountId}_${recordData.day}`;
        const idx = pendingRecords.findIndex(r => `${r.accountId}_${r.day}` === key);

        if (idx >= 0) {
          pendingRecords[idx] = recordData; // 更新
        } else {
          pendingRecords.push(recordData);  // 新增
        }
        wx.setStorageSync('pendingRecords', pendingRecords);
      }
    }
  });
},  
  
  // 重新尝试保存记录
  retrySaveRecord() {
    if (this.data.currentRecordData) {
      this.setData({ 
        saveFailed: false,
        cloudSaveRetries: 0
      });
      
      this.saveToCloud(this.data.currentRecordData);
    }
  }
});
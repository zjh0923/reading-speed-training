// train1-1.js
const app = getApp(); 
import { grade3Materials } from '../materials/grade3-materials';
import { grade4Materials } from '../materials/grade4-materials';
import { grade5Materials } from '../materials/grade5-materials';

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
    trials: []
  },
// 生命周期函数，从 URL 参数获取 day（训练天数）和 grade（年级），调用 initTraining 初始化训练
  onLoad(options) {
    const day = parseInt(options.day) || 1;
    const grade = options.grade || '3';
    this.initTraining(day, grade);
  },
// 初始化训练
  initTraining(day, grade) {
    // 获取材料
    let materials;
    switch(grade) {
      case '3': materials = grade3Materials; break;
      case '4': materials = grade4Materials; break;
      case '5': materials = grade5Materials; break;
      default: materials = grade3Materials;
    }
// 获取天数
    const dayData = materials[day] || {};
    const isDay1 = day === 1;
// 获取速度
    let initialSpeed = 200;
    if (isDay1) {
      initialSpeed = wx.getStorageSync('practiceCorrectSpeed') || 200;
    } else {
      const prevDayKey = `lastCorrectSpeed_day${day-1}`;
      initialSpeed = wx.getStorageSync(prevDayKey) || 200;
    }

    this.setData({
      currentDay: day,
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
      showCountdown: true
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
      
      setTimeout(() => {
        this.setData({ showPhaseTip: false });
        this.startTrial();
      }, 1500);
      return;
    }

    this.setData({
      showCountdown: false,
      showPhaseTip: true,
      phaseTipText: "练习阶段\n请看完句子后立刻点击屏幕答题，\n越快越好\n（点击屏幕开始练习）"
    });
  },

  handleStartPractice() {
    if (this.data.isPractice && this.data.showPhaseTip) {
      this.setData({ 
        showPhaseTip: false 
      });
      this.startTrial();
    }
  },
// 题目流程
  startTrial() {
    const trials = this.data.isPractice ? this.data.practiceTrials : this.data.trials;
    if (this.data.currentTrial >= trials.length) {
      if (this.data.isPractice) {
        return this.startFormalTraining();
      } else {
        return this.showFinalStats();
      }
    }

    this.setData({
      showFirstFixation: true,
      trialStartTime: Date.now()
    });

    setTimeout(() => {
      this.setData({
        showFirstFixation: false,
        showBlankScreen: true
      });

      setTimeout(() => {
        this.setData({ showBlankScreen: false });
        this.showSentence();
      }, 200);
    }, 500);
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
        durationPerWord = Math.max(100, durationPerWord - 6);
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
    let feedbackText;
    let duration = 500; // 默认时长
  
    if (this.data.isPractice) {
      feedbackText = isCorrect ? "\u221a" : "×";
      duration = 500; // 练习阶段统一500ms
    } else {
      if (isCorrect) {
        feedbackText = "√\n太棒啦";
        duration = 500; // 正式正确500ms
      } else {
        feedbackText = `×\n正确答案是${correctAnswer}\n继续加油哦`;
        duration = 1500; // 正式错误1500ms
      }
    }
  
    this.setData({
      showQuestions: false,
      showFeedback: true,
      feedbackSymbol: feedbackText
    });
  
    setTimeout(() => {
      this.setData({ showFeedback: false });
      setTimeout(() => {
        this.nextTrial();
      }, 200);
    }, duration);
  },

  nextTrial() {
    this.setData({ currentTrial: this.data.currentTrial + 1 });
    this.startTrial();
  },
// 正式训练
  startFormalTraining() {
    let practiceSpeed = 200;
    if (this.data.practiceValidDurations.length > 0) {
      const totalDuration = this.data.practiceValidDurations.reduce((sum, item) => sum + item.duration, 0);
      const totalWords = this.data.practiceValidDurations.reduce((sum, item) => sum + item.wordCount, 0);
      practiceSpeed = Math.round(totalDuration / totalWords);
    }

    wx.setStorageSync('practiceCorrectSpeed', practiceSpeed);

    this.setData({
      isPractice: false,
      durationPerWord: practiceSpeed,
      minDuration: practiceSpeed,
      currentTrial: 0,
      showPhaseTip: true,
      phaseTipText: `Day1正式训练开始\n初始速度: ${practiceSpeed}ms/词`
    });

    setTimeout(() => {
      this.setData({ showPhaseTip: false });
      this.startTrial();
    }, 2000);
  },

  showFinalStats() {
    const totalTime = ((Date.now() - this.data.startTime) / 1000).toFixed(1);
    const totalQuestions = this.data.correctCount + this.data.incorrectCount;
    const accuracy = totalQuestions > 0 
      ? (this.data.correctCount / totalQuestions * 100).toFixed(1)
      : 0;
  
    // 计算正确题目的平均速度
    const correctTrials = this.data.trials.filter(t => t.correctDuration);
    const correctSpeed = correctTrials.length > 0 
      ? Math.round(correctTrials.reduce((sum, t) => sum + t.correctDuration, 0) / correctTrials.length)
      : 0;
  
    // 更新数据
    this.setData({
      showStats: true,
      statsData: {
        totalTime: totalTime,
        correctCount: this.data.correctCount,
        incorrectCount: this.data.incorrectCount,
        accuracy: accuracy,
        minDuration: this.data.minDuration,
        correctSpeed: correctSpeed,
        currentDay: this.data.currentDay
      }
    });
  

  // 云开发保存记录
  const db = wx.cloud.database();
  db.collection('trainHistory').add({
    data: {
      username: app.globalData.userInfo.name,
      group: app.globalData.userInfo.group,
      day: this.data.currentDay,
      duration: parseFloat(totalTime),
      speed: correctSpeed,
      accuracy: parseFloat(accuracy),
      timestamp: new Date(),
      minSpeed: this.data.minDuration,
      correctCount: this.data.correctCount,
      incorrectCount: this.data.incorrectCount,
      completed: true // 新增字段标记完成状态
    },
    success: (res) => {
      console.log('[云数据库] 记录保存成功', res);
      // 触发本地缓存更新
      wx.setStorageSync('shouldRefreshRecords', true);
    },
    fail: (err) => {
      console.error('[云数据库] 保存失败', err);
      wx.showToast({
        title: '云端保存失败，请检查网络',
        icon: 'none',
        duration: 2000
      });
      // 本地临时存储
      const localRecord = {
        group: app.globalData.userInfo.group,
        username: app.globalData.userInfo.name,
        day: this.data.currentDay,
        duration: parseFloat(totalTime),
        speed: correctSpeed,
        accuracy: parseFloat(accuracy),
        timestamp: new Date().getTime(),
        completed: true // 新增关键字段
      };
      wx.setStorageSync('pendingRecords', 
        [...(wx.getStorageSync('pendingRecords') || []), localRecord]
      );
    }
  });

  // 同步更新本地历史记录
  const history = wx.getStorageSync('trainHistory') || [];
  history.push({
    day: this.data.currentDay,
    duration: parseFloat(totalTime),
    speed: correctSpeed,
    accuracy: parseFloat(accuracy),
    timestamp: new Date().getTime()
  });
  wx.setStorageSync('trainHistory', history);
}
});
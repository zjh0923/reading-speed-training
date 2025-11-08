import { grade3Materials } from './materials/grade3-materials.js';
import { grade4Materials } from './materials/grade4-materials.js';
import { grade5Materials } from './materials/grade5-materials.js';
import { api, isApiEnabled } from './api.js';

// 简易工具：本地存储封装，替代小程序的 wx.get/ setStorageSync
const storage = {
  get(key, defaultValue = null) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : defaultValue; } catch { return defaultValue; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

// 全局状态（模拟 app.globalData）
const appState = {
  userInfo: null,
  currentAccountId: null
};

// 路由与页面渲染
const routes = {
  '#/index': renderHome,
  '#/login': renderLogin,
  '#/account-select': renderAccountSelect,
  '#/my': renderMy,
  '#/password': renderPassword,
  '#/records': renderRecords,
  '#/train': renderTrain, // 统一训练页入口：#/train?day=1&group=1&grade=3
  // 兼容小程序页面命名：train1-1/2-1/3-1/4-1
  '#/train1-1': async () => await renderTrainAlias(1),
  '#/train2-1': async () => await renderTrainAlias(2),
  '#/train3-1': async () => await renderTrainAlias(3),
  '#/train4-1': async () => await renderTrainAlias(4)
};

function navigate(hash) { window.location.hash = hash; }

function getQuery() {
  const hash = window.location.hash;
  const [path, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');
  return { path, params };
}

function mount(html) {
  const root = document.getElementById('router-view');
  root.innerHTML = html;
  activateTabbar();
}

function activateTabbar() {
  const { path } = getQuery();
  document.querySelectorAll('.tabbar a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href').startsWith(path));
  });
}

// 计算最大可开放 Day（与小程序一致：每 12 小时 +1，最多 12）
function calculateMaxAllowedDay(createTime) {
  if (!createTime) return 1;
  const registerTime = new Date(createTime).getTime();
  const passedHours = (Date.now() - registerTime) / (1000 * 3600);
  return Math.min(12, Math.floor(passedHours / 12) + 1);
}

// 读取当前账号（从本地accountList或后端获取完整信息）
async function loadCurrentAccount() {
  const currentAccountId = storage.get('currentAccountId');
  appState.currentAccountId = currentAccountId || null;
  
  if (!currentAccountId) {
    appState.userInfo = null;
    return null;
  }
  
  // 优先从本地accountList获取
  const accountList = storage.get('accountList', []);
  let user = accountList.find(acc => acc.accountId === currentAccountId);
  
  // 如果本地没有，尝试从后端获取
  if (!user && isApiEnabled) {
    try {
      const res = await api.getUser(currentAccountId);
      user = res?.data || res || null;
      if (user) {
        // 保存到本地accountList
        const updatedList = [...accountList, user];
        storage.set('accountList', updatedList);
      }
    } catch {}
  }
  
  appState.userInfo = user || null;
  return user || { accountId: currentAccountId };
}

// Index 页面
async function renderHome() {
  const current = await loadCurrentAccount();
  const isLoggedIn = current && current.accountId;
  
  let user = current || {};
  let maxAllowedDay = 0; // 默认不允许开始训练
  
  // 如果已登录，计算最大可开放天数
  if (isLoggedIn) {
    maxAllowedDay = 1; // 初始值
    
    // 如果本地没有完整信息，尝试从后端拉取
    if (!user.name && isApiEnabled && appState.currentAccountId) {
      try {
        const res = await api.getUser(appState.currentAccountId);
        user = res?.data || res || null;
        if (user) {
          // 更新本地accountList
          const accountList = storage.get('accountList', []);
          const updatedList = accountList.map(acc => 
            acc.accountId === user.accountId ? user : acc
          );
          if (!updatedList.find(acc => acc.accountId === user.accountId)) {
            updatedList.push(user);
          }
          storage.set('accountList', updatedList);
          appState.userInfo = user;
        }
      } catch {}
    }
    
    maxAllowedDay = calculateMaxAllowedDay(user?.createTime);
  }

  // 后端优先获取完成记录（一次性取全，用于渲染所有 Day 的完成状态）
  let doneDaySet = new Set();
  let doneDayMeta = new Map(); // day -> { time, accuracy }
  let loadedFromBackend = false;
  (async () => {
    if (!isLoggedIn) {
      // 未登录时直接渲染，不加载记录
      render();
      return;
    }
    if (isApiEnabled && appState.currentAccountId) {
      try {
        const res = await api.listTrainRecords({ accountId: appState.currentAccountId });
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res)?res:[]);
        // 选择每个 day 最新一条作为展示
        const latestByDay = new Map();
        rows.forEach(r => {
          const d = Number(r?.day);
          if (!d) return;
          const ts = Number(r.timestamp || r.finishAt || 0);
          const prev = latestByDay.get(d);
          if (!prev || ts > (Number(prev.timestamp || prev.finishAt || 0))) latestByDay.set(d, r);
        });
        latestByDay.forEach((r, d) => {
          doneDaySet.add(d);
          doneDayMeta.set(d, { time: Number(r.timestamp || r.finishAt || Date.now()), accuracy: Number(r.accuracy || 0) }); 
        });
        loadedFromBackend = true;
      } catch {}
    }
    // 离线补偿：仅使用待回放队列（不再读取本地历史）
    const pending = storage.get('pendingRecords', []) || [];
    pending.filter(p => p.accountId === appState.currentAccountId).forEach(p => {
      const d = Number(p.day);
      doneDaySet.add(d);
      const ts = Number(p.timestamp || Date.now());
      const acc = Number(p.accuracy || 0);
      if (!doneDayMeta.has(d) || ts > doneDayMeta.get(d).time) doneDayMeta.set(d, { time: ts, accuracy: acc });
    });
    // 二次渲染，带完成标记
    render();
  })();

  function dayCard(day) {
    const isDone = doneDaySet.has(day);
    const disabled = !isLoggedIn || day > maxAllowedDay || isDone;
    const week = Math.ceil(day / 4);
    const meta = doneDayMeta.get(day);
    const metaHtml = isDone && meta ? `<div class="day-meta">${new Date(meta.time).toLocaleString()} · 正确率 ${isNaN(meta.accuracy)?0:meta.accuracy}%</div>` : '';
    let buttonText = '开 始';
    if (!isLoggedIn) {
      buttonText = '请先登录';
    } else if (isDone) {
      buttonText = '已完成';
    } else if (day > maxAllowedDay) {
      buttonText = '未开放';
    }
    return `
      <div class="day">
        <img class="img" src="/index/${day}.png" alt="${day}" />
        <div class="day-info">
          <span class="day-text">Day${day}</span>
          ${metaHtml}
        </div>
        <button class="button ${isDone ? 'completed' : ''}" data-day="${day}" ${disabled ? 'disabled' : ''}>${buttonText}</button>
      </div>
    `;
  }

  const section = (title, days) => `
    <div class="container2">
      <div class="weekend"><span class="weekend-text">${title}</span></div>
      ${days.map(dayCard).join('')}
    </div>
  `;

  function render() {
    const html = `
      <div class="hello">hello!</div>
      <div class="container1">
        <img class="jing" src="/index/jing.png" alt="jing" />
        <div class="train"><span class="train-text">快来练习吧!</span></div>
      </div>
      ${section('第一周', [1,2,3,4])}
      ${section('第二周', [5,6,7,8])}
      ${section('第三周', [9,10,11,12])}
    `;
    mount(html);

    // 事件绑定：开始训练
    document.querySelectorAll('.button[data-day]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const day = parseInt(btn.getAttribute('data-day'));
        if (!isLoggedIn) {
          alert('请先登录以开始训练');
          navigate('#/login');
          return;
        }
        if (doneDaySet.has(day)) { alert('已完成该训练'); return; }
        // 确保user信息已加载
        const currentUser = user || appState.userInfo || await loadCurrentAccount();
        handleGoToTrain(day, currentUser || {}, maxAllowedDay);
      });
    });
  }

  // 首次渲染（完成状态异步加载后会再次渲染）
  render();
}

function handleGoToTrain(day, user, maxAllowedDay) {
  if (day > maxAllowedDay) {
    alert(`Day${day} 未到开放时间`);
    return;
  }
  const url = `#/train?day=${day}&grade=${encodeURIComponent(user.grade)}&group=${encodeURIComponent(user.group)}&accountId=${encodeURIComponent(appState.currentAccountId)}`;
  navigate(url);
}

// Login 页面
function renderLogin() {
  const html = `
    <div class="section">
      <h3>登录</h3>
      <div class="row"><input id="name" class="input" placeholder="学生姓名" /></div>
      <div class="row">
        <select id="gender" class="input">
          <option value="">请选择性别</option>
          <option value="男">男</option>
          <option value="女">女</option>
        </select>
      </div>
      <div class="row"><input id="grade" class="input" placeholder="年级（例：3）" /></div>
      <div class="row"><input id="class" class="input" placeholder="班级" /></div>
      <div class="row"><input id="age" class="input" type="number" placeholder="年龄" /></div>
      <div class="row">
        <select id="group" class="input">
          <option value="">请选择组别</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </div>
      <div class="row"><button class="btn" id="btn-login">登录/注册</button></div>
      <p class="muted">注：网页版本使用本地存储模拟账号与训练记录。</p>
    </div>
  `;
  mount(html);
  document.getElementById('btn-login').addEventListener('click', async () => {
    const name = document.getElementById('name').value.trim();
    const gender = document.getElementById('gender').value.trim();
    const grade = document.getElementById('grade').value.trim();
    const class_ = document.getElementById('class').value.trim();
    const age = document.getElementById('age').value.trim();
    const group = document.getElementById('group').value.trim();
    if (!name || !grade || !group) { alert('请填写完整信息（姓名、年级、组别为必填项）'); return; }
    
    let accountId = storage.get('currentAccountId');
    const createTime = new Date().toISOString();
    
    // 构建完整的用户信息对象
    const userInfo = {
      name,
      gender: gender || undefined,
      grade,
      class: class_ || undefined,
      age: age || undefined,
      group,
      createTime,
      accountId: accountId || `acc_${Date.now()}_${Math.random().toString(36).slice(2,9)}`
    };
    
    // 调后端创建/更新用户
    if (isApiEnabled) {
      try {
        const res = await api.upsertUser(userInfo);
        const data = res?.data || res || {};
        userInfo.accountId = data.accountId || userInfo.accountId;
        // 如果后端返回了_id，保存它
        if (data._id) userInfo._id = data._id;
      } catch {
        // 后端失败时仍使用本地生成的accountId
      }
      // 登录后回放 pending 队列
      try { await replayPending(); } catch {}
    }
    
    // 保存到本地存储（与小程序保持一致）
    const accountList = storage.get('accountList', []);
    const existingIndex = accountList.findIndex(acc => acc.accountId === userInfo.accountId);
    if (existingIndex >= 0) {
      accountList[existingIndex] = { ...accountList[existingIndex], ...userInfo };
    } else {
      accountList.push(userInfo);
    }
    storage.set('accountList', accountList);
    storage.set('currentAccountId', userInfo.accountId);
    storage.set('userInfo', userInfo);
    appState.userInfo = userInfo;
    appState.currentAccountId = userInfo.accountId;
    
    navigate('#/index');
  });
}

// 账号选择页面（简化）
async function renderAccountSelect() {
  mount(`<div class="section"><h3>选择账号</h3><p class="muted">加载中...</p></div>`);
  
  // 优先从本地accountList读取
  let list = storage.get('accountList', []);
  const currentAccountId = storage.get('currentAccountId');
  
  // 如果后端可用，尝试同步并合并账号列表
  if (isApiEnabled) {
    try {
      const res = await api.listUsers();
      const backendList = Array.isArray(res?.data) ? res.data : (Array.isArray(res)?res:[]);
      // 合并本地和远程账号（远程优先，避免重复）
      const accountMap = new Map();
      list.forEach(acc => accountMap.set(acc.accountId, acc));
      backendList.forEach(acc => accountMap.set(acc.accountId, acc));
      list = Array.from(accountMap.values());
      // 更新本地存储
      storage.set('accountList', list);
    } catch {}
  }
  
  const html = `
    <div class="section">
      <h3>选择账号</h3>
      <ul class="list">
        ${list.length > 0 ? list.map(a => {
          const isCurrent = a.accountId === currentAccountId;
          return `<li><button class="btn ${isCurrent ? '' : 'ghost'}" data-id="${a.accountId}">${a.name}（年级${a.grade || '未知'}｜组${a.group || '未知'}）${isCurrent ? ' [当前]' : ''}</button></li>`;
        }).join('') : '<li class="muted">暂无账号，请先添加</li>'}
      </ul>
      <div class="row"><a class="btn" href="#/login">添加新账号</a></div>
    </div>
  `;
  mount(html);
  document.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const account = list.find(a => a.accountId === id);
      if (account) {
        storage.set('currentAccountId', id);
        storage.set('userInfo', account);
        appState.userInfo = account;
        appState.currentAccountId = id;
      } else {
        storage.set('currentAccountId', id);
      }
      navigate('#/index');
    });
  });
}

// 我的 页面
async function renderMy() {
  const user = await loadCurrentAccount();
  const html = `
    <div class="section">
      <h3>我的</h3>
      ${user && user.name ? `<p>姓名：${user.name}</p><p>年级：${user.grade || '未知'}</p><p>组别：${user.group || '未知'}</p>` : '<p class="muted">未登录</p>'}
      <div class="row">
        <a class="btn" href="#/account-select">切换账号</a>
        <a class="btn ghost" href="#/password" style="margin-left:8px">修改密码（占位）</a>
      </div>
    </div>
  `;
  mount(html);
}

// 密码 页面（占位）
function renderPassword() {
  const html = `
    <div class="section">
      <h3>修改密码</h3>
      <div class="row"><input class="input" placeholder="新密码（演示用，不实际生效）" /></div>
      <div class="row"><button class="btn" onclick="alert('演示页面，无后端')">保存</button></div>
    </div>
  `;
  mount(html);
}

// 记录 页面
async function renderRecords() {
  await loadCurrentAccount();
  mount(`<div class="section"><h3>训练记录</h3><p class="muted">加载中...</p></div>`);

  async function load() {
    try {
      let rows = [];
      // 检查 API 是否启用
      if (isApiEnabled && appState.currentAccountId) {
        const res = await api.listTrainRecords({ accountId: appState.currentAccountId });
        rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res)?res:[]);
      }
      // 如果没有从后端获取到数据，尝试从本地 pending 队列读取
      if (rows.length === 0) {
        const pending = storage.get('pendingRecords', []) || [];
        rows = pending.filter(p => p.accountId === appState.currentAccountId);
      }
      rows.sort((a,b) => a.day - b.day);
      const html = `
        <div class="section">
          <h3>训练记录</h3>
          <p class="muted">账号：${appState.currentAccountId || ''}</p>
          <ul class="list">${rows.map(r => `<li>Day${r.day} 完成时间：${new Date(r.timestamp || r.finishAt || Date.now()).toLocaleString()}</li>`).join('') || '<li class="muted">暂无记录</li>'}</ul>
        </div>
      `;
      mount(html);
    } catch (e) {
      const html = `
        <div class="section">
          <h3>训练记录</h3>
          <p class="muted">加载失败，请稍后重试。</p>
        </div>`;
      mount(html);
    }
  }
  load();
}

// 训练 页面（统一入口，代替 train1-1,2-1...）
function renderTrain() {
  const { params } = getQuery();
  const day = parseInt(params.get('day') || '1');
  const grade = (params.get('grade') || '3').toString();
  const accountId = params.get('accountId') || appState.currentAccountId;

  // 依据年级选择材料（默认为三年级）
  let materials = grade3Materials;
  if (grade === '4') materials = grade4Materials;
  if (grade === '5') materials = grade5Materials;
  const dayData = materials[day] || {};
  const practiceTrials = day === 1 ? (dayData.practice || []) : [];
  const formalTrials = dayData.formal || [];

  const state = {
    // 可视状态
    showCountdown: true,
    showPhaseTip: false,
    showFirstFixation: false,
    showBlankScreen: false,
    showSentence: false,
    showQuestions: false,
    showFeedback: false,
    showStats: false,

    // 训练参数
    isPractice: day === 1,
    countdown: 3,
    durationPerWord: 200,
    correctStreak: 0,
    minDuration: 200,

    displaySentence: '',
    wordArray: [],
    hiddenWordIndex: -1,

    sentenceStartTime: 0,
    readingDuration: 0,
    startTime: Date.now(),
    correctCount: 0,
    incorrectCount: 0,
    practiceValidDurations: [],
    currentDay: day,
    currentTrial: 0,
    currentQuestion: null,
    accountId,

    trialsPractice: practiceTrials,
    trialsFormal: formalTrials
  };

  function view() {
    const v = [];
    v.push(`<div class="train-container">`);
    if (state.showCountdown) v.push(`<div class="countdown">${state.countdown}</div>`);
    if (state.showPhaseTip) {
      v.push(`
        <div class="phase-tip" id="phaseTip">
          <div class="phase-card">
            <div class="phase-title">${state.isPractice ? '练习阶段' : 'Day' + day + ' 正式训练'}</div>
            <div class="phase-content">
              <span class="rule-item">${state.isPractice ? '注视“+”，出现句子后认真阅读，读完点击进入答题，根据内容作答。' : '注视“+”，随后句子每个词依次消失，最后答题。'}</span>
              ${!state.isPractice ? `<span class="rule-item">初始速度: ${state.durationPerWord}ms/词</span>` : ''}
            </div>
            <div class="phase-footer">（点击屏幕开始${state.isPractice ? '练习' : '正式训练'}）</div>
          </div>
        </div>
      `);
    }
    if (state.showFirstFixation) v.push(`<div class="fixation">+</div>`);
    if (state.showSentence) {
      v.push(`
        <div class="full-screen-container" id="tapArea">
          <div class="sentence-container">
            ${state.isPractice
              ? `<div class="sentence">${state.displaySentence}</div><div class="continue-tip">轻触屏幕进入答题</div>`
              : `<div class="sentence">${state.wordArray.map((w,i)=>`<span class="word ${i<=state.hiddenWordIndex?'hidden':''}">${w}</span>`).join(' ')}</div>`}
          </div>
        </div>
      `);
    }
    if (state.showBlankScreen) v.push(`<div class="blank-screen"></div>`);
    if (state.showQuestions && state.currentQuestion) {
      v.push(`
        <div class="question-container">
          <div class="question-text">${state.currentQuestion.question}</div>
          <div class="options-grid">
            ${state.currentQuestion.options.map((opt, idx)=>`<button class="option-btn" data-idx="${idx}">${opt}</button>`).join('')}
          </div>
        </div>
      `);
    }
    if (state.showFeedback) {
      v.push(`
        <div class="feedback show">
          <div class="feedback-icon">${state._lastCorrect ? '正确' : '错误'}</div>
          ${state._lastCorrect ? '' : `<div class="feedback-text">正确答案：${(state.currentQuestion||{}).options?.[state.currentQuestion.correct] || ''}</div>`}
        </div>
      `);
    }
    if (state.showStats) {
      const totalTime = ((Date.now() - state.startTime)/1000).toFixed(1);
      const total = state.correctCount + state.incorrectCount;
      const accuracy = total>0 ? (state.correctCount/total*100).toFixed(1) : 0;
      v.push(`
        <div class="stats-container">
          <div class="stats-header">训练完成！</div>
          <div class="stats-grid">
            <div class="stat-item"><div class="stat-label">总时长:</div><div class="stat-value">${totalTime}秒</div></div>
            <div class="stat-item"><div class="stat-label">正确题数:</div><div class="stat-value">${state.correctCount}</div></div>
            <div class="stat-item"><div class="stat-label">错误题数:</div><div class="stat-value">${state.incorrectCount}</div></div>
            <div class="stat-item"><div class="stat-label">正确率:</div><div class="stat-value">${accuracy}%</div></div>
            <div class="stat-item"><div class="stat-label">最高速度:</div><div class="stat-value">${state.minDuration}ms/词</div></div>
            <div class="stat-item"><div class="stat-label">正确均速:</div><div class="stat-value">${state.correctSpeed || state.durationPerWord}ms/词</div></div>
            <div class="stat-item full-width"><div class="stat-label">训练天数:</div><div class="stat-value">Day${day}</div></div>
          </div>
          <div class="row"><a class="btn" href="#/index">返回首页</a></div>
        </div>
      `);
    }
    v.push(`</div>`);
    mount(v.join(''));

    // 事件绑定
    const phaseTip = document.getElementById('phaseTip');
    if (phaseTip) phaseTip.addEventListener('click', () => { state.showPhaseTip = false; startTrial(); });
    const tapArea = document.getElementById('tapArea');
    if (tapArea && state.isPractice) tapArea.addEventListener('click', () => practiceTap());
    if (state.showQuestions) {
      document.querySelectorAll('.option-btn').forEach(btn => btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.idx))));
    }
  }

  function startCountdown() {
    view();
    const t = setInterval(() => {
      if (state.countdown > 1) { state.countdown -= 1; view(); }
      else { clearInterval(t); startPracticePhase(); }
    }, 1000);
  }

  function startPracticePhase() {
    if (!state.isPractice) {
      state.showCountdown = false; state.showPhaseTip = true; view(); return;
    }
    state.showCountdown = false; state.showPhaseTip = true; view();
  }

  function startTrial() {
    const trials = state.isPractice ? state.trialsPractice : state.trialsFormal;
    if (state.currentTrial >= trials.length) return state.isPractice ? startFormalTraining() : showFinalStats();
    const current = trials[state.currentTrial];
    const sentenceRaw = (current.sentence || '').trim();
    const sentence = sentenceRaw.replace(/ /g, '');
    state.displaySentence = sentence;
    state.showFirstFixation = true; state.showSentence = false; state.showBlankScreen = false; state.showQuestions = false; state.showFeedback = false;
    view();
    setTimeout(() => {
      state.showFirstFixation = false; state.showSentence = true; state.sentenceStartTime = Date.now();
      if (!state.isPractice) {
        state.wordArray = sentenceRaw.split(' '); state.hiddenWordIndex = -1; view();
        const wordTimer = setInterval(() => {
          if (state.hiddenWordIndex < state.wordArray.length - 1) { state.hiddenWordIndex += 1; view(); }
          else { clearInterval(wordTimer); transitionToQuestion(); }
        }, state.durationPerWord);
      } else {
        view();
      }
    }, 500);
  }

  function practiceTap() {
    const readingDuration = Date.now() - state.sentenceStartTime;
    state.showSentence = false; state.showBlankScreen = true; view();
    setTimeout(() => { state.readingDuration = readingDuration; presentQuestion(); }, 200);
  }

  function transitionToQuestion() { state.showSentence = false; setTimeout(() => presentQuestion(), 200); }

  function presentQuestion() {
    const trials = state.isPractice ? state.trialsPractice : state.trialsFormal;
    state.currentQuestion = trials[state.currentTrial];
    state.showBlankScreen = false; state.showQuestions = true; view();
  }

  function handleAnswer(selectedIdx) {
    const trials = state.isPractice ? state.trialsPractice : state.trialsFormal;
    const current = trials[state.currentTrial];
    const isCorrect = selectedIdx === current.correct;
    if (state.isPractice) {
      if (isCorrect) {
        const wordCount = current.sentence.split(' ').length;
        state.practiceValidDurations.push({ duration: state.readingDuration, wordCount });
      }
    } else {
      state.correctCount += isCorrect ? 1 : 0;
      state.incorrectCount += isCorrect ? 0 : 1;
      if (isCorrect) current.correctDuration = state.durationPerWord;
      adjustSpeed(isCorrect);
    }
    state._lastCorrect = isCorrect;
    state.showQuestions = false; state.showFeedback = true; view();
    setTimeout(() => { state.showFeedback = false; nextTrial(); }, isCorrect ? 500 : 1500);
  }

  function adjustSpeed(isCorrect) {
    if (isCorrect) {
      state.correctStreak += 1;
      if (state.correctStreak >= 3) { state.durationPerWord = Math.max(80, state.durationPerWord - 6); state.correctStreak = 0; }
    } else { state.durationPerWord += 6; state.correctStreak = 0; }
    state.minDuration = Math.min(state.minDuration, state.durationPerWord);
  }

  function nextTrial() { state.currentTrial += 1; saveProgress(); startTrial(); }

  function startFormalTraining() {
    let practiceSpeed = 200;
    if (state.practiceValidDurations.length > 0) {
      const totalDuration = state.practiceValidDurations.reduce((s, x) => s + x.duration, 0);
      const totalWords = state.practiceValidDurations.reduce((s, x) => s + x.wordCount, 0);
      practiceSpeed = Math.round(totalDuration / totalWords);
    }
    localStorage.setItem(`practiceCorrectSpeed_${state.accountId}`, JSON.stringify(practiceSpeed));
    state.isPractice = false; state.durationPerWord = practiceSpeed; state.minDuration = practiceSpeed; state.currentTrial = 0; state.showPhaseTip = true; view();
  }

  function showFinalStats() {
    const totalTime = ((Date.now() - state.startTime) / 1000).toFixed(1);
    let correctSpeed = 0;
    const correctTrials = state.trialsFormal.filter(t => t.correctDuration);
    correctSpeed = correctTrials.length > 0 ? Math.round(correctTrials.reduce((s,t)=>s+t.correctDuration,0)/correctTrials.length) : state.durationPerWord;
    state.correctSpeed = correctSpeed;
    localStorage.setItem(`lastCorrectSpeed_day${state.currentDay}_${state.accountId}`, JSON.stringify(correctSpeed));

    // 保存记录到后端或本地
    const record = {
      username: storage.get('userInfo')?.name || '未知用户',
      group: storage.get('userInfo')?.group || '未知组',
      day: state.currentDay,
      duration: parseFloat(totalTime),
      speed: correctSpeed,
      accuracy: parseFloat(((state.correctCount/(state.correctCount+state.incorrectCount || 1))*100).toFixed(1)),
      timestamp: Date.now(),
      accountId: state.accountId,
      grade
    };
    (async () => {
      let uploadOk = false;
      try {
        if (isApiEnabled) {
          await api.addTrainRecord(record);
          uploadOk = true;
        }
      } catch (e) {
        // 失败则写入本地 pending 队列，待下次有网再补偿
        const key = `${record.accountId}_${record.day}`;
        let pending = storage.get('pendingRecords', []);
        const pIdx = pending.findIndex(r => `${r.accountId}_${r.day}` === key);
        if (pIdx >= 0) pending[pIdx] = record; else pending.push(record);
        storage.set('pendingRecords', pending);
      } finally {
        // 不再写入本地历史，仅保留 pending 队列离线补偿
      }
    })();
    storage.set(`trainProgress_${state.accountId}`, null);

    state.showStats = true; view();
  }

  function saveProgress() {
    if (state.showStats) return;
    const progress = {
      day: state.currentDay,
      grade,
      accountId: state.accountId,
      isPractice: state.isPractice,
      currentTrial: state.currentTrial,
      correctCount: state.correctCount,
      incorrectCount: state.incorrectCount,
      durationPerWord: state.durationPerWord,
      correctStreak: state.correctStreak,
      minDuration: state.minDuration,
      practiceValidDurations: state.practiceValidDurations,
      startTime: state.startTime
    };
    storage.set(`trainProgress_${state.accountId}`, progress);
  }

  // 入口
  // 速度初始化（沿用小程序策略）
  if (day === 1) {
    const s = storage.get(`practiceCorrectSpeed_${accountId}`); state.durationPerWord = s || 200; state.minDuration = state.durationPerWord;
  } else {
    const prev = storage.get(`lastCorrectSpeed_day${day-1}_${accountId}`) || 200; state.durationPerWord = prev; state.minDuration = prev;
  }
  startCountdown();
}

// 兼容小程序页面命名到统一训练入口
async function renderTrainAlias(day) {
  // 读取当前账号，拼出统一入口参数
  const current = await loadCurrentAccount();
  if (!current || !current.accountId) { 
    alert('未找到用户信息，请先登录'); 
    navigate('#/login'); 
    return; 
  }
  const grade = current.grade || '3';
  const group = current.group || '1';
  const url = `#/train?day=${day}&grade=${encodeURIComponent(grade)}&group=${encodeURIComponent(group)}&accountId=${encodeURIComponent(current.accountId)}`;
  navigate(url);
}

async function router() {
  const { path } = getQuery();
  const handler = routes[path] || renderHome;
  await handler();
}

window.addEventListener('hashchange', () => router());
window.addEventListener('load', async () => {
  if (!location.hash) navigate('#/index');
  // 启动时尝试回放 pending 队列
  (async () => { try { await replayPending(); } catch {} })();
  await router();
});

async function replayPending() {
  if (!isApiEnabled) return;
  let pending = storage.get('pendingRecords', []);
  if (!Array.isArray(pending) || pending.length === 0) return;
  const remained = [];
  for (const rec of pending) {
    try { await api.addTrainRecord(rec); }
    catch { remained.push(rec); }
  }
  storage.set('pendingRecords', remained);
}



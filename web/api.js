export const API_BASE = import.meta?.env?.VITE_API_BASE || '';
export const isApiEnabled = !!API_BASE; // 若配置了 API 地址，则走后端

async function request(path, options = {}) {
  if (!isApiEnabled) throw new Error('API 未配置');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers||{}) },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export const api = {
  // 云函数替代：checkUserExist
  async checkUserExist(openid) { return request('/users/check', { method: 'POST', body: JSON.stringify({ openid }) }); },
  // 云函数替代：getUserInfo（Web 无 OPENID，可用后端会话）
  async getUserInfo() { return request('/users/me'); },
  // 云函数替代：updateUserInfo（create/update）
  async upsertUser(data) { return request('/users', { method: 'POST', body: JSON.stringify(data) }); },
  // 用户列表/详情（用于账号切换）
  async listUsers(query) { const qs = new URLSearchParams(query||{}).toString(); return request(`/users?${qs}`); },
  async getUser(id) { return request(`/users/${id}`); },

  // 训练记录
  async addTrainRecord(data) { return request('/trainHistory', { method: 'POST', body: JSON.stringify(data) }); },
  async listTrainRecords(query) { const qs = new URLSearchParams(query||{}).toString(); return request(`/trainHistory?${qs}`); }
};



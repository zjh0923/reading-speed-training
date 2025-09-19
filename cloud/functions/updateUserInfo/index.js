// updateUserInfo 云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const db = cloud.database()
  const wxContext = cloud.getWXContext()

  // 直接使用云函数自带的 openid
  const userData = {
    ...event,
    _openid: wxContext.OPENID, // 使用系统自动生成的_openid字段
    createTime: db.serverDate()
  }
  return db.collection('users').doc(wxContext.OPENID).set({
    data: userData
  })
}
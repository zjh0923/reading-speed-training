// 云函数 checkUserExist
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { openid } = event

  const res = await db.collection('users')
    .where({ _openid: openid })
    .get()

  return {
    exist: res.data.length > 0,
    userInfo: res.data[0] || null
  }
}
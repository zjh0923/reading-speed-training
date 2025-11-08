// cloudfunctions/updateUserInfo/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()

  try {
    if (event._id) {
      // 编辑模式：根据 _id 更新
      const { _id, ...updateData } = event
      await db.collection('users').doc(_id).update({
        data: {
          ...updateData,
          updateTime: db.serverDate()
        }
      })
      return {
        success: true,
        message: '用户信息更新成功',
        type: 'update'
      }
    } else {
      // 创建模式：新增记录
      const userInfo = {
        ...event,
        _openid: wxContext.OPENID,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
      const addRes = await db.collection('users').add({ data: userInfo })
      return {
        success: true,
        message: '用户信息创建成功',
        type: 'create',
        _id: addRes._id
      }
    }
  } catch (err) {
    console.error('云函数执行失败：', err)
    return {
      success: false,
      message: err.message
    }
  }
}

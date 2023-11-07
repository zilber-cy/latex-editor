import { db, ObjectId } from '../../mongodb.js'

export async function createMessage(roomId, userId, content, timestamp) {
  let newMessageOpts = {
    content,
    room_id: roomId,
    user_id: userId,
    timestamp,
  }
  newMessageOpts = _ensureIdsAreObjectIds(newMessageOpts)
  const confirmation = await db.messages.insertOne(newMessageOpts)
  newMessageOpts._id = confirmation.insertedId
  return newMessageOpts
}

export async function getMessages(roomId, limit, before) {
  let query = { room_id: roomId }
  if (before) {
    query.timestamp = { $lt: before }
  }
  query = _ensureIdsAreObjectIds(query)
  return db.messages.find(query).sort({ timestamp: -1 }).limit(limit).toArray()
}

export async function findAllMessagesInRooms(roomIds) {
  return db.messages
    .find({
      room_id: { $in: roomIds },
    })
    .toArray()
}

export async function deleteAllMessagesInRoom(roomId) {
  await db.messages.deleteMany({
    room_id: roomId,
  })
}

export async function deleteAllMessagesInRooms(roomIds) {
  await db.messages.deleteMany({
    room_id: { $in: roomIds },
  })
}

export async function updateMessage(
  roomId,
  messageId,
  userId,
  content,
  timestamp
) {
  const query = _ensureIdsAreObjectIds({
    _id: messageId,
    room_id: roomId,
  })
  if (userId) {
    query.user_id = ObjectId(userId)
  }
  const res = await db.messages.updateOne(query, {
    $set: {
      content,
      edited_at: timestamp,
    },
  })
  return res.modifiedCount === 1
}

export async function deleteMessage(roomId, messageId) {
  const query = _ensureIdsAreObjectIds({
    _id: messageId,
    room_id: roomId,
  })
  await db.messages.deleteOne(query)
}

function _ensureIdsAreObjectIds(query) {
  if (query.user_id && !(query.user_id instanceof ObjectId)) {
    query.user_id = ObjectId(query.user_id)
  }
  if (query.room_id && !(query.room_id instanceof ObjectId)) {
    query.room_id = ObjectId(query.room_id)
  }
  if (query._id && !(query._id instanceof ObjectId)) {
    query._id = ObjectId(query._id)
  }
  return query
}

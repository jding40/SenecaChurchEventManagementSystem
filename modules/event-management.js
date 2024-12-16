const mongoose = require("mongoose");
//import { startOfDay } from "date-fns";
const { startOfDay } = require("date-fns");
const { fromZonedTime } = require("date-fns-tz");
let Schema = mongoose.Schema;
require("dotenv").config();

const eventSchema = new Schema({
  eventId: { type: String, unique: true },
  imgUrl: { type: String },
  topic: String,
  shortDesc: String,
  fullDesc: String,
  eventLocation: String,
  eventDate: { type: Date }, // 日期属性
  eventTime: { type: String },
});

let Event; // 将在新连接上定义

function initialize() {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(process.env.MONGODB, {
      //useNewUrlParser: true, //已过时 直接移除即可
      //useUnifiedTopology: true,//已过时 直接移除即可
      dbName: "SenecaChurch",
    });

    db.on("error", (err) => {
      reject(err); // 拒绝并返回错误
    });
    db.once("open", () => {
      Event = db.model("events", eventSchema); // inventories 是数据库中的集合名称
      resolve();
    });
  });
}

function updateEvent(eventData) {
  const torontoTime = eventData.eventDate;
  const utcDate = fromZonedTime(torontoTime, "America/Toronto");
  eventData.eventDate = utcDate;

  return new Promise((resolve, reject) => {
    if (!eventData.eventId) {
      reject("Error: eventId is required to update an event");
      return;
    }

    Event.updateOne(
      { eventId: eventData.eventId }, // 条件：匹配指定的 eventId
      { $set: eventData }, // 使用传入的 eventData 更新字段
      { runValidators: true } // 确保更新时遵循 Schema 中的验证规则
    )
      .then((result) => {
        if (result.matchedCount === 0) {
          reject(`No event found with eventId: ${eventData.eventId}`);
        } else {
          resolve(
            `Event with eventId: ${eventData.eventId} successfully updated`
          );
        }
      })
      .catch((err) => {
        reject(`Error updating event: ${err}`);
      });
  });
}

function registerEvent(eventData) {
  return new Promise((resolve, reject) => {
    const torontoTime = eventData.eventDate;
    const timeZone = "America/Toronto";
    const utcDate = fromZonedTime(torontoTime, timeZone);
    eventData.eventDate = utcDate;

    let newEvent = new Event(eventData);
    newEvent
      .save()
      .then(() => resolve())
      .catch((err) => {
        if (err.code === 11000) {
          reject(`Error:${err} `);
        } else {
          reject(`There was an error creating the event: ${err}`);
        }
      });
  });
}

async function generateEventId() {
  try {
    // 获取当前年份的后两位
    const currentYear = new Date().getFullYear().toString().slice(-2);

    // 从数据库中查找所有事件 ID
    const events = await Event.find({}, "eventId").lean();
    const eventIds = events
      .map((event) => parseInt(event.eventId))
      .filter(Boolean);

    // 筛选以当前年份开头的 ID 并获取最大的后缀
    const yearPrefix = parseInt(currentYear) * 100; // 例如，2024 年是 2400
    const maxId = eventIds
      .filter((id) => id >= yearPrefix && id < yearPrefix + 100)
      .reduce((max, id) => Math.max(max, id), yearPrefix);

    // 返回新的唯一 ID
    return (maxId + 1).toString();
  } catch (err) {
    throw new Error(`Error generating Event ID: ${err.message}`);
  }
}

async function getAllActiveEvents() {
  try {
    // 获取今天的日期（从凌晨开始）
    const today = startOfDay(new Date()); // 使用 date-fns 的 startOfDay 方法

    // 查询数据库，获取今天或以后的事件，并按日期升序排列
    const activeEvents = await Event.find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 }) // 按日期升序排序
      .lean(); // 返回普通 JavaScript 对象

    return activeEvents;
  } catch (err) {
    //console.error("Error fetching active events:", err);
    throw new Error("Unable to fetch active events");
  }
}

async function getAllPastEvents() {
  try {
    // 获取今天的日期（从凌晨开始）
    const today = startOfDay(new Date()); // 使用 date-fns 的 startOfDay 方法

    // 查询数据库，获取今天或以后的事件，并按日期升序排列
    const activeEvents = await Event.find({ eventDate: { $lt: today } })
      .sort({ eventDate: -1 }) // 按日期升序排序
      .lean(); // 返回普通 JavaScript 对象

    return activeEvents;
  } catch (err) {
    //console.error("Error fetching active events:", err);
    throw new Error("Unable to fetch active events");
  }
}

function getEventById(id) {
  return new Promise((resolve, reject) => {
    Event.findOne({ eventId: id })
      .then((event) => {
        if (!event) {
          reject(`No event found with ID: ${id}`);
        } else {
          resolve(event);
        }
      })
      .catch((err) => {
        reject(`Error retrieving event: ${err}`);
      });
  });
}

module.exports = {
  initialize,
  registerEvent,
  generateEventId,
  getAllActiveEvents,
  getAllPastEvents,
  getEventById,
  updateEvent,
};

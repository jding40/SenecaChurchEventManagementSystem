const mongoose = require("mongoose");
//import { startOfDay } from "date-fns";

let Schema = mongoose.Schema;
require("dotenv").config();

const registrationSchema = new Schema({
  registrationId: { type: Number, unique: true },
  firstName: { type: String, unique: false },
  lastName: { type: String, unique: false },
  gender: { type: String, unique: false },
  tel: { type: String, unique: false },
  eventId: { type: String, unique: false },
  topic: { type: String, unique: false },
  remarks: { type: String, unique: false },
});

let Registration; // 将在新连接上定义

function initialize() {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(process.env.MONGODB, {
      //useNewUrlParser: true, //过时语句，直接移除即可
      //useUnifiedTopology: true, //已过时 直接移除即可
      dbName: "SenecaChurch",
    });

    db.on("error", (err) => {
      reject(err); // 拒绝并返回错误
    });
    db.once("open", () => {
      Registration = db.model("registrations", registrationSchema);
      resolve();
    });
  });
}

function registerRegistration(registrationData) {
  return new Promise((resolve, reject) => {
    if (
      registrationData.topic.length > 120 ||
      registrationData.eventId.length > 10 ||
      registrationData.firstName.length > 40 ||
      registrationData.lastName.length > 40 ||
      registrationData.gender.length > 20 ||
      registrationData.tel.length > 20 ||
      registrationData.remarks.length > 200
    ) {
      return reject("Invalid input!");
    }
    generateRegistrationId()
      .then((num) => {
        // 添加生成的 registrationId
        const updatedRegistrationData = {
          topic: registrationData.topic,
          eventId: registrationData.eventId,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          gender: registrationData.gender,
          tel: registrationData.tel,
          remarks: registrationData.remarks,
          registrationId: num,
        };

        // 创建新的注册记录
        let newRegistration = new Registration(updatedRegistrationData);

        return newRegistration.save(); // 返回保存的 Promise
      })
      .then(() => {
        resolve("You have successfully registered in this event!");
      })
      .catch((err) => {
        if (err.code === 11000) {
          reject("A registration with the same ID already exists.");
        } else {
          reject(`There was an error creating the registration: ${err}`);
        }
      });
  });
}

//无Registration的函数
// function registerRegistration(registrationData) {
//   return new Promise((resolve, reject) => {
//     // 创建新的注册记录
//     const newRegistration = new Registration(registrationData);

//     // 保存到数据库
//     newRegistration
//       .save()
//       .then(() => {
//         resolve("You have successfully registered in this event!");
//       })
//       .catch((err) => {
//         if (err.code === 11000) {
//           reject(
//             "A registration with the same email or event ID already exists."
//           );
//         } else {
//           reject(
//             `There was an error creating the registration: ${err.message}`
//           );
//         }
//       });
//   });
// }

async function generateRegistrationId() {
  return new Promise((resolve, reject) => {
    // 确保 Registration 模型已定义
    if (!Registration) {
      reject("The Registration model is not initialized.");
      return;
    }

    Registration.findOne({})
      .sort({ registrationId: -1 }) // 按 registrationId 降序排序
      .limit(1) // 只取一个最大值
      .then((doc) => {
        // 如果存在记录，则在最大值基础上加 1
        const newId = doc ? 1 + doc.registrationId : 1; // 如果没有记录，起始值为 1
        resolve(newId);
      })
      .catch((err) => {
        reject(`Error finding the max registrationId: ${err}`);
      });
  });
}

function getRegistrationsByEventId(eId) {
  return new Promise((resolve, reject) => {
    // 使用 MongoDB 的 `find` 方法来查询符合条件的文档
    Registration.find({ eventId: eId })
      .then((registrations) => {
        resolve(registrations);
      })
      .catch((err) => {
        reject(`Error retrieving registrations: ${err}`);
      });
  });
}

module.exports = {
  initialize,
  registerRegistration,
  //generateRegistrationId,
  getRegistrationsByEventId,
};

//step B0
const bcrypt = require("bcryptjs"); //stands for "Blowfish Crypt"

//step A2.4
const mongoose = require("mongoose");
//step A2.4
let Schema = mongoose.Schema;

//step A2.5
//用于加载.env文件中的环境变量到Node.js的process.env对象中。
require("dotenv").config();

1;
2;
//step A2.6
const userSchema = new Schema({
  userId: { type: String, unique: true },
  passWord: String,
  userType: String,
  email: String,
  tel: String,
  firstName: String,
  lastName: String,
  loginHistory: [
    {
      dateTime: Date,
      userAgent: String,
    },
  ],
});

//step A2.7
let User; // to be defined on new connection (see initialize)

//version 2
function initialize() {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(process.env.MONGODB, {
      dbName: "SenecaChurch",
    });

    db.on("error", (err) => {
      reject(err); // reject the promise with the provided error
    });
    db.once("open", () => {
      //console.log(`Connected to database: ${db.name}`); // Log the database name
      User = db.model("Users", userSchema); //Users is the name of the collection in the database
      resolve();
    });
  });
}

// function registerUser(userData) {
//   return new Promise((resolve, reject) => {
//     if (userData.password !== userData.password2)
//       reject("Passwords do not match");
//     else {
//       bcrypt.hash(userData.password, 10).then((hash) => {
//         userData.password = hash;
//         let newUser = new User(userData);
//         debugger;
//         newUser
//           .save()
//           .then(() => resolve())
//           .catch((err) => {
//             debugger;
//             if (err.code === 11000) {
//               debugger;
//               console.log("xxxxxxxxxxxxxx");
//               reject("User Name already taken");
//             } else {
//               reject(`There was an error creating the user: ${err}`);
//             }
//           })
//           .catch((err) => {
//             return Promise.reject(
//               "There was an error creating encrypting the password"
//             );
//           });
//         //})
//       });
//     }
//   });
// }

function registerUser(userData) {
  return new Promise((resolve, reject) => {
    //console.log("print inside auth-service.registerUser");
    if (userData.passWord !== userData.passWord2) {
      return reject("Passwords do not match");
    }
    if (
      userData.firstName.length > 40 ||
      userData.firstName.length > 40 ||
      userData.userId.length > 40 ||
      userData.email.length > 40 ||
      userData.tel.length > 20 ||
      (userData.userType !== "member" &&
        userData.userType !== "coordinator" &&
        userData.userType !== "pastor")
    ) {
      return reject("Invalid input!");
    }
    if (!userData.passWord || typeof userData.passWord !== "string") {
      return reject("Password is missing or invalid");
    }

    bcrypt
      .hash(userData.passWord, 10)
      .then((hash) => {
        userData.passWord = hash;
        let newUser = new User(userData);
        newUser.userType = "member";

        newUser
          .save()
          .then(() => resolve())
          .catch((err) => {
            if (err.code === 11000) {
              reject(`User Name already taken!`);
            } else {
              reject(`There was an error creating the user: ${err}`);
            }
          });
      })
      .catch((err) => {
        reject("There was an error encrypting the password");
      });
  });
}

//function for Part B
function checkUser(userData) {
  return new Promise((resolve, reject) => {
    User.find({ userId: userData.userId }).then((users) => {
      if (users.length == 0)
        //users为空白数组 另 最好加上reject，否则后面的语句继续执行会导致服务器崩溃
        return reject(`Unable to find user: ${userData.userId}`);

      bcrypt
        .compare(userData.passWord, users[0].passWord)
        .then((result) => {
          if (!result)
            return reject(`Incorrect Password for user: ${userData.userId}`);
          else {
            if (users[0].loginHistory.length >= 3) users[0].loginHistory.pop();
            users[0].loginHistory.unshift({
              dateTime: new Date().toString(),
              userAgent: userData.userAgent,
            });

            User.updateOne(
              { userId: users[0].userId },
              { $set: { loginHistory: users[0].loginHistory } }
            )
              .then(() => {
                resolve(users[0]);
              })
              .catch((err) => {
                reject(`There was an error verifying the user: ${err}`);
              });
          }
        })
        .catch((err) => reject(err));
    });
  });
}

module.exports = { initialize, registerUser, checkUser };

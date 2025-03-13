//update in Github Workspace
const authData = require("./modules/auth-service");
const eventManagement = require("./modules/event-management");
const registrationManagement = require("./modules/registration-management");
const express = require("express");
const app = express();
const clientSessions = require("client-sessions");
const { format } = require("date-fns");
app.set("views", __dirname + "/views");

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  clientSessions({
    cookieName: "session", // this is the object name that will be added to 'req'
    secret: "fq34rfe44565y66dg#f", // this should be a long un-guessable string.
    duration: 180 * 60 * 1000, // duration of the session in milliseconds (3 hours)
    activeDuration: 1000 * 60 * 30, // the session will be extended by this many ms each request (30 minute)
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  //res.locals.user = req.session.user || null; //确保新标签的登录状态同步(存疑)

  next();
});

function ensureStaffLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else if (req.session.user.userType === "member") {
    res.render("error", {
      user: req.session.user,
      error:
        "Sorry, only pastor and coordinator are allowed access to this page!",
    });
  } else {
    next();
  }
}

app.set("view engine", "ejs");

// app.get("/", (req, res) => {
//   eventManagement
//     .getAllActiveEvents()
//     .then((events) => {
//       //console.log("length of events is", events.length);
//       upcomingEvents = events.map((event) => ({
//         ...event,
//         eventDateFormatted: format(event.eventDate, "MMM dd, yyyy"),
//       }));
//       res.render("home", {
//         upcomingEvents,
//         pastEvents: [],
//         format,
//         user: req.session.user,
//       });
//     })
//     .catch((error) => res.render("error", { error }));
// });

app.get("/", (req, res) => {
  Promise.all([
    eventManagement.getAllActiveEvents(),
    eventManagement.getAllPastEvents(),
  ])
    .then(([activeEvents, pastEvents]) => {
      // 格式化将要举办的活动日期
      const formattedActiveEvents = activeEvents.map((event) => ({
        ...event,
        eventDateFormatted: format(event.eventDate, "MMM dd, yyyy"),
      }));

      // 格式化已经举办过的活动日期
      const formattedPastEvents = pastEvents.map((event) => ({
        ...event,
        eventDateFormatted: format(event.eventDate, "MMM dd, yyyy"),
      }));

      //console.log(formattedPastEvents);

      res.render("home", {
        activeEvents: formattedActiveEvents,
        pastEvents: formattedPastEvents,
        format,
        user: req.session.user,
      });
    })
    .catch((error) => {
      console.error("Error loading events:", error);
      res.status(404).render("error", { error, user: req.session.user });
    });
});

app.get("/signup", (req, res) => {
  if (req.session.user)
    return res.status(403).render("error", {
      error:
        "You are already logged in. Please log out if you wish to create a new account.",
      user: req.session.user,
    });
  res.render("signup", {
    error: null,
    user: req.session.user,
  });
});

app.post("/signup", (req, res) => {
  authData
    .registerUser(req.body)
    .then(() => {
      //req.session.user = { ...req.body };
      req.session.user = {
        userId: req.body.userId,
        firstName: req.body.firstName,
        userType: req.body.userType,
      };
      res.render("success", {
        message: "Succesfully registered!",
        user: req.session.user, //不能用user
      });
    })
    .catch((error) =>
      res.render("error", {
        error,
        user: {
          userId: req.body.userId,
          firstName: req.body.firstName,
          firstLame: req.body.firstName,
          userType: req.body.userType,
        },
      })
    );
});

app.get("/login", (req, res) => {
  if (req.session.user)
    return res.status(403).render("error", {
      error:
        "You are already logged in. Please log out if you wish to login a new account.",
      user: req.session.user,
    });
  res.render("login", {
    error: null,
    user: req.session.user,
  });
});

app.post("/login", (req, res) => {
  req.body.userAgent = req.get("User-Agent");
  //console.log("req.body.userAgent is", req.body.userAgent);
  authData
    .checkUser(req.body)
    .then((user) => {
      // console.log("user is:");
      // console.log(user);
      // console.log("{...user} is:");
      // console.log({ ...user });
      // req.session.user = {
      //   ...user,
      // };

      //req.session.user = user.toJSON();

      req.session.user = {
        // 不包含密码或其他敏感信息
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
      };
      //console.log("req.session.user is");
      //console.log(req.session.user);

      res.redirect("/");
    })
    .catch((err) =>
      res.render("login", { error: err, user: req.session.user })
    );
});

app.get("/createEvent", ensureStaffLogin, (req, res) => {
  eventManagement
    .generateEventId()
    .then((eid) =>
      res.render("createEvent", {
        eid,
        user: req.session.user,
      })
    )
    .catch((error) => res.render("error", { error, user }));
});

app.post("/createEvent", ensureStaffLogin, (req, res) => {
  eventManagement
    .registerEvent(req.body)
    .then(() =>
      res.render("success", { message: "You successfully created an event!" })
    )
    .catch((error) => res.render("error", { error, user }));
});
// app.listen(HTTP_PORT, () => {
//   console.log(`server listening on: ${HTTP_PORT}`);
// });

app.get("/reviseEvent/:eid", ensureStaffLogin, (req, res) => {
  eventManagement
    .getEventById(req.params.eid)
    .then((event) => {
      return res.render("reviseEvent", { user: req.session.user, event });
    })
    .catch((error) => res.render("error", { error, user }));
});

app.post("/reviseEvent/:eid", ensureStaffLogin, (req, res) => {
  eventManagement
    .updateEvent(req.body)
    .then(() =>
      res.render("success", {
        message: "You successfully updated this event!",
        user: req.session.user,
      })
    )
    .catch((error) => res.render("error", { error, user: req.session.user }));
});

app.get("/enrollEvent/:eid", (req, res) => {
  eventManagement
    .getEventById(req.params.eid)
    .then((event) => {
      event.eventDateFormatted = format(event.eventDate, "MMM dd, yyyy");
      res.render("enrollEvents", { event, user: req.session.user });
    })
    .catch((error) => {
      //if (req.session) console.log("req.session exsited.");
      //if (!req.session.user) console.log("req.session.user NOT exsited.");
      res.render("error", { error, user: req.session.user }); //req.session exsited && req.session.user NOT exsited.
    });
});

app.post("/enrollEvent/:eid", (req, res) => {
  registrationManagement
    .registerRegistration(req.body)
    .then((message) => {
      //res.redirect("/");
      res.render("success", { message, user: req.session.user });
    })
    .catch((err) =>
      res.render("error", {
        user: req.session.user,
        error: err,
        ID: req.body.ID,
      })
    );
});

app.get("/eventStatus/:eid", ensureStaffLogin, (req, res) => {
  let event;
  eventManagement
    .getEventById(req.params.eid)
    .then((e) => {
      event = e;
      event.eventDateFormatted = format(event.eventDate, "MMM dd, yyyy");
      return registrationManagement.getRegistrationsByEventId(req.params.eid);
    })
    .then((registrations) => {
      res.render("eventStatus", {
        registrations,
        event,
        user: req.session.user,
      });
    })
    .catch((error) => res.render("error", { error, user: req.session.user }));
});

app.delete("/deleteEvent/:eid", ensureStaffLogin, (req, res) => {
  eventManagement
    .deleteEvent(req.params.eid)
    .then(() =>
      res.render("success", {
        message: "You successfully deleted this event!",
        user: req.session.user,
      })
    )
    .catch((error) => res.render("error", { error, user: req.session.user }));
});

app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/");
});

app.use((req, res, next) => {
  res.status(404).render("404", { user: req.session.user });
});

authData
  .initialize()
  .then(() => registrationManagement.initialize())
  .then(() => eventManagement.initialize())
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`server listening on: ${HTTP_PORT}`);
    });
  })
  .catch((err) => {
    console.log(`unable to start server: ${err}`);
  });

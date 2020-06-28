import session from "express-session";
import connectMongo from "connect-mongo";

const mongoStore = connectMongo(session);

/**
 * This variable is where save session, in this case is mongodb
 */
const sessionStore = new mongoStore({
  url: `${process.env.DB_CONNECTION}://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  autoReconnect: true,
  // autoRemove: "native"
});

/**
 * Config session for app
 * @params app from exactly module
 */
const configSession = (app) => {
  app.use(
    session({
      key: "express.sid",
      secret: "mySecret",
      store: sessionStore,
      resave: true,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1day
      },
    })
  );
};

module.exports = configSession;

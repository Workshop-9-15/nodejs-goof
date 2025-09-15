const mongoose = require('mongoose');
const cfenv = require("cfenv");
const Schema = mongoose.Schema;

const Todo = new Schema({
  content: Buffer,
  updated_at: Date,
});

mongoose.model('Todo', Todo);

const User = new Schema({
  username: String,
  password: String,
});

mongoose.model('User', User);

// CloudFoundry env const s
const mongoCFUri = cfenv.getAppEnv().getServiceURL('goof-mongo');
console.log(JSON.stringify(cfenv.getAppEnv()));

// Default Mongo URI is local
const DOCKER = process.env.DOCKER
let mongoUri;
if (DOCKER === '1') {
  mongoUri = 'mongodb://goof-mongo/express-todo';
} else {
  mongoUri = 'mongodb://localhost/express-todo';
}

// CloudFoundry Mongo URI
if (mongoCFUri) {
  mongoUri = mongoCFUri;
} else if (process.env.MONGOLAB_URI) {
  mongoUri = process.env.MONGOLAB_URI;
} else if (process.env.MONGODB_URI) {
  mongoUri = process.env.MONGODB_URI;
}

console.log("Using Mongo URI " + mongoUri);

mongoose.connect(mongoUri);

User = mongoose.model('User');
User.find({ username: 'admin@snyk.io' }).exec(function (err, users) {
  console.log(users);
  if (users.length === 0) {
    console.log('no admin');
    new User({ username: 'admin@snyk.io', password: 'SuperSecretPassword' }).save(function (err, user, count) {
      if (err) {
        console.log('error saving admin user');
      }
    });
  }
});

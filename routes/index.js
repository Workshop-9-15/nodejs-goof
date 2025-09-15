const utils = require('../utils');
const mongoose = require('mongoose');
const Todo = mongoose.model('Todo');
const User = mongoose.model('User');
// TODO:
const hms = require('humanize-ms');
const ms = require('ms');
const streamBuffers = require('stream-buffers');
const readline = require('readline');
const moment = require('moment');
const exec = require('child_process').exec;
const validator = require('validator');

// zip-slip
const fileType = require('file-type');
const AdmZip = require('adm-zip');
const fs = require('fs');
const os = require('os');
const path = require('path');

// prototype-pollution
const _ = require('lodash');

exports.index = function (req, res, next) {
  Todo.
    find({}).
    sort('-updated_at').
    exec(function (err, todos) {
      if (err) return next(err);

      res.render('index', {
        title: 'Patch TODO List',
        subhead: 'Vulnerabilities at their best',
        todos: todos,
      });
    });
};

exports.loginHandler = function (req, res, next) {
  if (validator.isEmail(req.body.username)) {
    const username = validator.escape(req.body.username);
    const password = validator.escape(req.body.password);
    
    User.findOne({ 
      username: { $eq: username }, 
      password: { $eq: password } 
    }, function (err, user) {
      if (user) {
        const redirectPage = req.body.redirectPage
        const session = req.session
        const username = req.body.username
        return adminLoginSuccess(redirectPage, session, username, res)
      } else {
        return res.status(401).send()
      }
    });
  } else {
    return res.status(401).send()
  }
};

function adminLoginSuccess(redirectPage, session, username, res) {
  session.loggedIn = 1

  // Log the login action for audit
  console.log(`User logged in: ${username}`)

  if (redirectPage) {
      const allowedDomains = ['localhost', '127.0.0.1'];
      const allowedPaths = ['/admin', '/dashboard', '/profile'];
      
      try {
        const url = new URL(redirectPage, 'http://localhost');
        const isAllowedDomain = allowedDomains.includes(url.hostname);
        const isAllowedPath = allowedPaths.includes(url.pathname) || url.pathname.startsWith('/admin/');
        
        if (isAllowedDomain && isAllowedPath) {
          return res.redirect(redirectPage)
        } else {
          return res.redirect('/admin')
        }
      } catch (e) {
        return res.redirect('/admin')
      }
  } else {
      return res.redirect('/admin')
  }
}

exports.login = function (req, res, next) {
  return res.render('admin', {
    title: 'Admin Access',
    granted: false,
    redirectPage: req.query.redirectPage
  });
};

exports.admin = function (req, res, next) {
  return res.render('admin', {
    title: 'Admin Access Granted',
    granted: true,
  });
};

exports.get_account_details = function(req, res, next) {
  // @TODO need to add a database call to get the profile from the database
  // and provide it to the view to display
  const profile = {}
 	return res.render('account.hbs', profile)
}

exports.save_account_details = function(req, res, next) {
  // get the profile details from the JSON
	const profile = req.body
  // validate the input
  if (validator.isEmail(profile.email, { allow_display_name: true })
    // allow_display_name allows us to receive input as:
    // Display Name <email-address>
    // which we consider valid too
    && validator.isMobilePhone(profile.phone, 'he-IL')
    && validator.isAscii(profile.firstname)
    && validator.isAscii(profile.lastname)
    && validator.isAscii(profile.country)
  ) {
    // trim any extra spaces on the right of the name
    profile.firstname = validator.rtrim(profile.firstname)
    profile.lastname = validator.rtrim(profile.lastname)

    const safeProfile = {
      email: validator.escape(profile.email),
      phone: validator.escape(profile.phone),
      firstname: validator.escape(profile.firstname),
      lastname: validator.escape(profile.lastname),
      country: validator.escape(profile.country)
    };
    
    return res.render('account.hbs', safeProfile)
  } else {
    // if input validation fails, we just render the view as is
    console.log('error in form details')
    return res.render('account.hbs')
  }
}

exports.isLoggedIn = function (req, res, next) {
  if (req.session.loggedIn === 1) {
    return next()
  } else {
    return res.redirect('/')
  }
}

exports.logout = function (req, res, next) {
  req.session.loggedIn = 0
  req.session.destroy(function() { 
    return res.redirect('/')  
  })
}

function parse(todo) {
  let t = todo;

  const remindToken = ' in ';
  const reminder = t.toString().indexOf(remindToken);
  if (reminder > 0) {
    let time = t.slice(reminder + remindToken.length);
    time = time.replace(/\n$/, '');

    const period = hms(time);

    console.log('period: ' + period);

    // remove it
    t = t.slice(0, reminder);
    if (typeof period != 'undefined') {
      t += ' [' + ms(period) + ']';
    }
  }
  return t;
}

exports.create = function (req, res, next) {
  // console.log('req.body: ' + JSON.stringify(req.body));

  let item = req.body.content;
  const imgRegex = /\!\[alt text\]\((http.*)\s\".*/;
  if (typeof (item) == 'string' && item.match(imgRegex)) {
    const url = item.match(imgRegex)[1];
    console.log('found img: ' + url);

    if (validator.isURL(url, { protocols: ['http', 'https'] })) {
      console.log('Image URL detected for manual review: ' + validator.escape(url));
    } else {
      console.log('Invalid image URL detected and blocked');
    }

  } else {
    item = parse(item);
  }

  new Todo({
    content: item,
    updated_at: Date.now(),
  }).save(function (err, todo, count) {
    if (err) return next(err);

    /*
    res.setHeader('Data', todo.content.toString('base64'));
    res.redirect('/');
    */

    res.setHeader('Location', '/');
    res.status(302).send(todo.content.toString('base64'));

    // res.redirect('/#' + todo.content.toString('base64'));
  });
};

exports.destroy = function (req, res, next) {
  Todo.findById(req.params.id, function (err, todo) {

    try {
      todo.remove(function (err, todo) {
        if (err) return next(err);
        res.redirect('/');
      });
    } catch (e) {
    }
  });
};

exports.edit = function (req, res, next) {
  Todo.
    find({}).
    sort('-updated_at').
    exec(function (err, todos) {
      if (err) return next(err);

      res.render('edit', {
        title: 'TODO',
        todos: todos,
        current: req.params.id
      });
    });
};

exports.update = function (req, res, next) {
  Todo.findById(req.params.id, function (err, todo) {

    todo.content = req.body.content;
    todo.updated_at = Date.now();
    todo.save(function (err, todo, count) {
      if (err) return next(err);

      res.redirect('/');
    });
  });
};

// ** express turns the cookie key to lowercase **
exports.current_user = function (req, res, next) {

  next();
};

function isBlank(str) {
  return (!str || /^\s*$/.test(str));
}

exports.import = function (req, res, next) {
  if (!req.files) {
    res.send('No files were uploaded.');
    return;
  }

  const importFile = req.files.importFile;
  let data;
  let importedFileType = fileType(importFile.data);
  const zipFileExt = { ext: "zip", mime: "application/zip" };
  if (importedFileType === null) {
    importedFileType = { ext: "txt", mime: "text/plain" };
  }
  if (importedFileType["mime"] === zipFileExt["mime"]) {
    const zip = AdmZip(importFile.data);
    const extracted_path = path.join(os.tmpdir(), 'goof_extracted_files_' + Date.now());
    
    const entries = zip.getEntries();
    let hasValidEntries = true;
    
    entries.forEach(function(entry) {
      const entryPath = entry.entryName;
      if (entryPath.includes('..') || entryPath.startsWith('/') || entryPath.includes('\\')) {
        hasValidEntries = false;
        console.log('Blocked malicious zip entry: ' + entryPath);
      }
    });
    
    if (hasValidEntries) {
      zip.extractAllTo(extracted_path, true);
    } else {
      console.log('Zip file contains malicious entries and was blocked');
      return res.status(400).send('Invalid zip file');
    }
    
    data = "No backup.txt file found";
    fs.readFile('backup.txt', 'ascii', function (err, data) {
      if (!err) {
        data = data;
      }
    });
  }else {
    data = importFile.data.toString('ascii');
  }
  const lines = data.split('\n');
  lines.forEach(function (line) {
    const parts = line.split(',');
    const what = parts[0];
    console.log('importing ' + what);
    const when = parts[1];
    const locale = parts[2];
    const format = parts[3];
    let item = what;
    if (!isBlank(what)) {
      if (!isBlank(when) && !isBlank(locale) && !isBlank(format)) {
        console.log('setting locale ' + parts[1]);
        moment.locale(locale);
        const d = moment(when);
        console.log('formatting ' + d);
        item += ' [' + d.format(format) + ']';
      }

      new Todo({
        content: item,
        updated_at: Date.now(),
      }).save(function (err, todo, count) {
        if (err) return next(err);
        console.log('added ' + todo);
      });
    }
  });

  res.redirect('/');
};

exports.about_new = function (req, res, next) {
  console.log(JSON.stringify(req.query));
  return res.render("about_new.dust",
    {
      title: 'Patch TODO List',
      subhead: 'Vulnerabilities at their best',
      device: req.query.device
    });
};

// Prototype Pollution

///////////////////////////////////////////////////////////////////////////////
// In order of simplicity we are not using any database. But you can write the
// same logic using MongoDB.
const users = [
  // You know password for the user.
  { name: 'user', password: 'pwd' },
  // You don't know password for the admin.
  { name: 'admin', password: Math.random().toString(32), canDelete: true },
];

let messages = [];
let lastId = 1;

function findUser(auth) {
  return users.find((u) =>
    u.name === auth.name &&
    u.password === auth.password);
}
///////////////////////////////////////////////////////////////////////////////

exports.chat = {
  get(req, res) {
    res.send(messages);
  },
  add(req, res) {
    const user = findUser(req.body.auth || {});

    if (!user) {
      res.status(403).send({ ok: false, error: 'Access denied' });
      return;
    }

    const message = {
      // Default message icon. Cen be overwritten by user.
      icon: '👋',
    };

    Object.assign(message, {
      text: req.body.message && req.body.message.text ? String(req.body.message.text) : '',
      id: lastId++,
      timestamp: Date.now(),
      userName: user.name,
    });

    messages.push(message);
    res.send({ ok: true });
  },
  delete(req, res) {
    const user = findUser(req.body.auth || {});

    if (!user || !user.canDelete) {
      res.status(403).send({ ok: false, error: 'Access denied' });
      return;
    }

    messages = messages.filter((m) => m.id !== req.body.messageId);
    res.send({ ok: true });
  }
};

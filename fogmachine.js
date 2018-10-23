const express = require('express');
const fm = express();
const fs = require('fs');
const fe = require('path');
const bodyParser = require('body-parser');

exports.init = function (program) {
  // Setup Secret for JWT
  try {
    // If user entered a filepath
    if (fs.statSync(program.secret).isFile()) {
      program.secret = fs.readFileSync(program.secret, 'utf8');
    }
  } catch (error) {
    if (program.secret) {
      // just use secret as is
      program.secret = String(program.secret);
    } else {
      // If no secret was given, generate one
      require('crypto').randomBytes(48, function (err, buffer) {
        program.secret = buffer.toString('hex');
      });
    }
  }

  var server;
  if (program.ssl && program.ssl.cert && program.ssl.key) {
    try {
      // TODO: Verify files are real
      server = require('https').createServer({
        key: fs.readFileSync(program.ssl.key),
        cert: fs.readFileSync(program.ssl.cert)
      });
    } catch (error) {
      console.log('FAILED TO CREATE HTTPS SERVER');
      error.code = 'BAD CERTS';
      throw error;
    }
  } else {
    server = require('http').createServer();
  }

  // Magic Middleware Things
  fm.use(bodyParser.json()); // support json encoded bodies
  fm.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

  fm.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  // Give access to public folder
  fm.use('/public', express.static(fe.join(__dirname, program.userinterface)));
  // Serve the webapp
  fm.get('/', function (req, res) {
    res.sendFile(fe.join(program.userinterface, './src/index.js'), { root: __dirname });
  });
  // Serve Shared Page
  fm.all('/admin', function (req, res) {
    res.sendFile(fe.join(program.userinterface, 'admin.html'), { root: __dirname });
  });

  // Setup Album Art
  if (!program.albumArtDir) {
    program.albumArtDir = fe.join(__dirname, 'image-cache');
  }
  fm.use('/album-art', express.static(program.albumArtDir));

  // Setup all folders with express static
  fm.use('/media/', express.static(program.media));

  fm.get('/api/test/all-public', (req, res) => {
    res.json([{"id":"1","name":"MyFirstSingle","type":"single","genre":"house","transcoded":false,"media":[{"title":"MyFirstSingle","file":"/media/1/single.mp3","trackNo":1,"waveform":"/media/path/to/waveform.svg"}]},{"id":"2","name":"MyFirstAlbum","type":"album","genre":"house","transcoded":true,"media":[{"title":"Thefirstsong","file":"/media/2/song1.mp3","trackNo":1,"waveform":"/media/path/to/waveform2.svg"},{"title":"Thesecondsong","file":"/media/2/song2.mp3","trackNo":2,"waveform":"/media/path/to/waveform3.svg"},{"title":"Thethirdsong","file":"/media/3/song3.mp3","trackNo":3,"waveform":"/media/path/to/waveform4.svg"}]}]);
  });

  // File Explorer
  require('./modules/file-explorer.js').setup(fm, program);
  require('./modules/download.js').setup(fm, program);

  // User System and Login API + Middleware
  if (program.users) {
    require("./modules/login.js").setup(fm, program);
  }

  const loki = require('lokijs');
  const db = new loki(program.database);
  require('./modules/admin.js').setup(fm, program, db);
  require('./modules/upload.js').setup(fm, program);

  // Used to determine the user has a working login token
  fm.get('/ping', function (req, res) {
    res.json({ success: true });
  });

  // Start the server!
  server.on('request', fm);
  server.listen(program.port, function () {
    let protocol = program.ssl && program.ssl.cert && program.ssl.key ? 'https' : 'http';
    console.log('Access FogMachine locally: ' + protocol + '://localhost:' + program.port);
  });
}

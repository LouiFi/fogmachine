const Busboy = require("busboy");
const fs = require("fs");
const fe = require("path");
const makeDir = require('make-dir');

exports.setup = function(fm, program) {
  fm.post("/upload", function (req, res) {
    if (!req.headers['data-location']) {
      return res.status(500).json({ error: 'No Location Provided' });
    }

    const saveTo = fe.join(program.media, filename);

    // Check if path exits, if not make the path
    if (!fs.existsSync(fe.dirname(saveTo))) {
      makeDir.sync(fe.dirname(psaveTo));
    }

    const busboy = new Busboy({ headers: req.headers });

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      console.log(`Uploading File: ${saveTo}`);
      file.pipe(fs.createWriteStream(saveTo));
    });

    busboy.on("finish", function () {
      res.json({ success: true });
    });

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
      console.log('Field [' + fieldname + ']: value: ' + val);
    });

    return req.pipe(busboy);
  });
  
  // parse directories
  fm.post("/dirparser", function(req, res) {
    var directories = [];
    var filesArray = [];

    // Return vpaths if no path is given
    if (req.body.dir === "" || req.body.dir === "/") {
      for (let dir of req.user.vpaths) {
        directories.push({
          type: "directory",
          name: dir
        });
      }
      return res.json({ path: "/", contents: directories });
    }

    var path = fe.join(program.media, req.body.dir);

    // Make sure it's a directory
    if (!fs.statSync(path).isDirectory()) {
      res.status(500).json({ error: "Not a directory" });
      return;
    }


    // get directory contents
    var files = fs.readdirSync(path);

    // loop through files
    for (let i = 0; i < files.length; i++) {
      try {
        var stat = fs.statSync(fe.join(path, files[i]));
      } catch (error) {
        // Bad file, ignore and continue
        continue;
      }

      // Handle Directories
      if (stat.isDirectory()) {
        directories.push({
          type: "directory",
          name: files[i]
        });
      } else {
        // Handle Files
        var extension = getFileType(files[i]);
        if (
          fileTypesArray.indexOf(extension) > -1 &&
          masterFileTypesArray.indexOf(extension) > -1
        ) {
          filesArray.push({
            type: extension,
            name: files[i]
          });
        }
      }
    }

    // Sort it because we can't rely on the OS returning it pre-sorted
    directories.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
    filesArray.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });

    // Format directory string for return value
    directory = directory.replace(/\\/g, "/");
    if (directory.slice(-1) !== "/") {
      directory += "/";
    }

    // Send back combined list of directories and mp3s
    res.json({ path: directory, contents: directories.concat(filesArray) });
  });

  function getFileType(filename) {
    return filename.split(".").pop();
  }
};

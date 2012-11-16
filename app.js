
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , csv = require('csv')
  , fs = require('fs');

  /*
var csv = require('csv');
var fs = require('fs');
var app = module.exports = express();
var io = require('socket.io').listen(app);
*/
// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  //app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

/* 
  our 'database' is just a text file of video ids for now
  we read into an in-memory array whenever the file changes

  interface

  var broadcaster = require('broadcaster');
  broadcaster().
  .file(DATA_FILE)
  .client(io.sockets);

*/
var VIDEO_INTERVAL = 5000;
var videos = [];
var index = 0;
var DATA_FILE = __dirname + '/data.txt';
var intervalId = 0;
var currentVid = {};

function sendVideo() {
  var vid = videos[index++ % videos.length];
  console.log('Now playing: ' + vid);
  var now = (new Date())/1000;
  var data = {vid:vid, time:now};
  currentVid = data;
  io.sockets.emit('vid', data);
}

function readVideos() {
  videos = [];
  csv()
  .from.path(DATA_FILE)
  .transform(function(data){
      data.unshift(data.pop());
      return data;
  })
  .on('record',function(data, index){
      videos.push(data[0]);
  })
  .on('end',function(count){
      console.log('Read in', count, 'videos.');
      intervalId = setInterval(sendVideo, VIDEO_INTERVAL);
  })
  .on('error',function(error){
      console.log(error.message);
  });
}

// fs.watchFile(DATA_FILE, function (curr, prev) {
//   console.log('Video list has changed, refreshing...');
//   clearInterval(intervalId);
//   readVideos();
// });

// Real-time
io.sockets.on('connection', function(socket) {
    socket.emit('vid', currentVid);
    socket.on("disconnect", function() {

    });
});

// Routes

app.get('/',  function(req, res){
  res.sendfile(__dirname + '/views/index.html');
});

app.get('/test/',  function(req, res){
  res.sendfile(__dirname + '/views/smooth.html');
});

server.listen(process.env['app_port'] || 3000);
console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
readVideos();
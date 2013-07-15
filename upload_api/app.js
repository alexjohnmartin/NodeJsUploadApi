
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();
var http = require('http');
var guid = require('node-uuid');
var lastMsgId = guid.v1(); 
var currentMsgId; 
var correlationId; 
var sys = require('sys');
var zmq = require('zmq');
var pubSocket = zmq.socket('pub');
pubSocket.bindSync("tcp://127.0.0.1:5000");

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
// if ('development' == app.get('env')) {
//   app.use(express.errorHandler());
// }

// app.get('/', routes.index);
// app.get('/users', user.list);

app.post('/upload', function(req, res) {
	currentMsgId = guid.v1(); 
	correlationId = guid.v1(); 

    //console.log(JSON.stringify(req.files));
    var data = parseRequestIntoObject(req); 
    console.log(JSON.stringify(data));
    saveFile(req, res, data); 
    writeEventToFlatFile(data); 
    publishEvent(data); 

    lastMsgId = currentMsgId; 

    res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('Hello World\n');
});

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});

process.on('SIGINT', function() {
	pubSocket.close();
});

function saveFile(req, res, data) {
	console.log("saving file");
	var fs = require('fs'); 
	fs.readFile(req.files.uploadFile.path, function (err, rdata) {
	  var newPath = "./uploads/" + data.filename;
	  fs.writeFile(newPath, data, function (err) {
	  	if (err !== null) {
		  	console.log("Error: " + err); 
		    res.redirect("back");
		}
	  });
	});
}

function publishEvent(data) {
	console.log("publishing event");
	pubSocket.send("RPT_NEW_" + serializedData(data));
}

function writeEventToFlatFile(data) {
	console.log("writing to flat file");
	var command = "echo '" + currentMsgId + "|" + correlationId + "|" + serializedData(data) + "' >> events.txt";
	var exec = require('child_process').exec;
	var child = exec(command, function (error, stdout, stderr) { /* do something */ });
}

function getFileExtension(filename) {
	var index = filename.lastIndexOf(".");
	if (index > -1) {
		return filename.substring(index);
	}

	return "";
}

function parseRequestIntoObject(req) {
	var data = new Object(); 
	data.userId = req.body.userId; 
	data.filename = correlationId + getFileExtension(req.files.uploadFile.name);
	data.prevMsgId = lastMsgId; 
	data.msgId = currentMsgId; 
	data.correlationId = correlationId; 
	return data; 
}

function serializedData(data) {
	return JSON.stringify(data); 
}

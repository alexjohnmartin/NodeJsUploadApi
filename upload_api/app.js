
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
var eventsFileName; 
var sys = require('sys');
//var zmq = require('zmq');
//var pubSocket = zmq.socket('pub');
//pubSocket.bindSync("tcp://127.0.0.1:5000");
//var subSocket = zmq.socket('sub'); 

//subSocket.on('message', function(reply){
//	console.log("message received: " + reply.toString());
//});

//subSocket.connect("tcp://127.0.0.1:5000"); 
//subSocket.subscribe('RPT_NEW_');

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
console.log("POST received");

	currentMsgId = guid.v1(); 
	correlationId = guid.v1(); 
	eventsFileName = "events.txt";

    var data = parseRequestIntoObject(req); 
    saveFile(req, res, data);
    saveEventToEventStore(data); 
    //publishEvent(data);  

    lastMsgId = currentMsgId; 

    res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('Receipt uploaded\n');
});

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});

//process.on('SIGINT', function() {
//	subSocket.close(); 
//	pubSocket.close();
//});

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

function saveEventToEventStore(data) {
	console.log("sending event to event store");

	var eventStoreEvent = new Object(); 
	eventStoreEvent.eventId = guid.v1(); 
	eventStoreEvent.eventType = "receipt-uploaded";
	eventStoreEvent.data = data; 

	var post_data = "[" + serializedData(eventStoreEvent) + "]"; 
	sendHttpPost(post_data); 

	console.log("sent event to event store");
}


function sendHttpPost(post_data) {

	// An object of options to indicate where to post to
	var post_options = {
		host: '127.0.0.1',
		port: '2113',
		path: '/streams/uploadstream',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': post_data.length
		}
	};

	// Set up the request
	var post_req = http.request(post_options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('Response: ' + chunk);
		});
	});

	// post the data
	post_req.write(post_data);
	post_req.end();
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

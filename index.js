var express = require('express');
var app = express();
var port = 3700;

var io = require('socket.io').listen(app.listen(port));


//var rooms = ["room1", "room2", "room3"];
var rooms = {
	"room1": [],
	"room2": [],
	"room3": []
}

var usernames = {}

var session = require('express-session')({
	secret: "secretsupersecret",
	resave: true,
	saveUninitialized: true,
});

var sharedsession = require("express-socket.io-session")

app.use(session);

io.use(sharedsession(session, {
	autoSave: true
}));


app.set('views', __dirname + '/template');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res) {
	res.render("chat");
});



app.get("/room/:room", function(req, res) {
	var room = req.params.room;
	console.log("Room id is: ", room);
	res.render("chat");
});

app.use(express.static(__dirname + '/public'));




io.sockets.on('connection', function(socket) {


	socket.on('adduser', function(username, room) {
		//(socket.handshake.session.username) ? socket.handshake.session.username : username;
		socket.username = username;
		socket.username = username;
		socket.handshake.session.username = username;
		socket.room = room;
		rooms[room].push(username);
		socket.join(room);
		var msg = "You have connected to " + room;
		socket.emit('message', { message: msg });
		socket.broadcast.to(room).emit('message', {message: username + " has connected to the chat."});
		socket.emit('updaterooms', Object.keys(rooms), room);

	});

	socket.on('getUsername', function(username, room) {
		var nameToUse = (socket.handshake.session.username) ? socket.handshake.session.username : username;
		socket.emit('initUsername', nameToUse);
	});

	socket.on('changeUsername', function(username) {
		socket.handshake.session.username = username;
		usernames[socket.username] = username;
		socket.broadcast.emit('message', { message: socket.username + " has changed name to " + username + "."});
		socket.username = username;
	});

	socket.on('send', function(msg) {
		socket.broadcast.in(socket.room).emit('message', {username: socket.username, message: msg });
	});

	socket.on('switchRoom', function (newroom) {
		socket.leave(socket.room);
		rooms[socket.room].splice(rooms[socket.room].indexOf(socket.username), 1);

		socket.join(newroom);
		socket.emit('message', { message: 'You have connected to ' + newroom });

		socket.broadcast.to(socket.room).emit('message', { message: socket.username + " has left this room." });
		socket.room = newroom;
		socket.broadcast.to(newroom).emit('message', { message: socket.username + " has joined this room." });
		socket.emit('updaterooms', Object.keys(rooms), newroom);
	});

	socket.on('disconnect', function() {
		rooms[socket.room].splice(rooms[socket.room].indexOf(socket.username), 1);
		delete usernames[socket.username];
		io.sockets.emit('updateusers', usernames);

		socket.broadcast.emit('message', { message: socket.username + " has disconnected." });
		socket.leave(socket.room);
	});
});





console.log("Listening on port " + port);



function contains(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true;
       }
    }
    return false;
}

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}
var express = require('express');
var app = express();
var port = 5000;

var User = require('./user');

var io = require('socket.io').listen(app.listen(port));




//var rooms = ["room1", "room2", "room3"];
var rooms = {
	//"room": {"sessid": User}
	"room1": {},
	"room2": {},
	"room3": {}
}

var usernames = {
}

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


	function addUser(username, room) {
		//(socket.handshake.session.username) ? socket.handshake.session.username : username;
		var sessId = socket.handshake.session.id;
		socket.username = username;
		socket.handshake.session.username = username;
		socket.room = room;
		console.log("Current socket id was " + socket.id);
		rooms[room][sessId] = new User(username, sessId, socket.id);
		socket.join(room);
		var msg = "You have connected to " + room;
		socket.emit('message', { message: msg });
		socket.broadcast.to(room).emit('message', {message: username + " has connected to the chat."});
		//socket.emit('updaterooms', Object.keys(rooms), room);

		updateUsers();

	};

	function updateUsers() {
		var usernames = []
		var room = rooms[socket.room]
		for (var sessId in room) {
			usernames.push(room[sessId].username);
		}
		console.log(usernames);
		io.sockets.in(socket.room).emit('updateUsersInRoom', usernames);
	}



	socket.on('join', function(username, room) {

		console.log("joining!");

		var sessId = socket.handshake.session.id;
		console.log(sessId);
		var nameToUse = (socket.handshake.session.username) ? socket.handshake.session.username : username;
		var userWasNew = true;
		if (room in rooms) {
			var users = rooms[room];

			if (sessId in users) {
				users[sessId].socketIds.push(socket.id);
				socket.room = room;
				socket.username = users[sessId].username;
				socket.join(room);
				userWasNew = false;
				//socket.emit('updaterooms', Object.keys(rooms), room);
			} else {

				for (var key in users) {
					var existingUser = users[key];

					console.log("Existing user's username: " + existingUser.username);
					console.log("Name attempted: " + nameToUse);
					console.log("Existing user's sessionId: " + existingUser.sessionId);
					console.log("Session id: " + sessId);
					if (existingUser.username == nameToUse && existingUser.sessionId != sessId) {
						console.log("Someone else is using " + nameToUse + " already.");
						var usernameList = [];
						for (var v in users) {
							usernameList.push(users[v].username);
						}
						do {
							nameToUse = "Anonymous" + parseInt(100000 * Math.random());
							console.log("Checking... " + nameToUse);
						} while (contains(usernameList, nameToUse))
						console.log("Joining with the username: " + nameToUse);
					}
				}
			}
			console.log("No conflicts.");
		} else {
			console.log("Room didn't exist. New room created.");
			rooms[room] = [];
		}

		// if (userWasNew)
		// 	addUser(nameToUse, room);
		// socket.emit('updateUsername', nameToUse);
		socket.emit('updateUsername', nameToUse);

		if (userWasNew) {
			addUser(nameToUse, room);
		}
	});

	socket.on('changeUsername', function(username) {
		var room = rooms[socket.room]
		console.log(room);
		var user = room[socket.handshake.session.id];
		var usernameList = [];
		for (var sessId in room) {
			usernameList.push(room[sessId].username);
		}

		if (contains(usernameList, username)) {
			console.log("Name was in use.");
			socket.emit('message', { message: username + " is already in use."});
			socket.emit('updateUsername', socket.username);
		} else if (user != undefined) {

			
			for (var sessId in room) {

				if (sessId != socket.handshake.session.id) {
					var otherUser = room[sessId];
					for (var i = 0; i < otherUser.socketIds.length; i++) {
						var sock = io.sockets.connected[otherUser.socketIds[i]];
						sock.emit('message', { message: socket.handshake.session.username + " has changed name to " + username + "."});
					} 
					
				}

			}

			for (var i = 0; i < user.socketIds.length; i++) {
				var sock = io.sockets.connected[user.socketIds[i]];
				//usernames[socket.handshake.session.id] = username;
				sock.username = username;
				sock.emit('updateUsername', username);
				sock.emit('message', { message: "You have changed your name to " + username + "."})
			}
			
			user.username = username;
			
			//socket.broadcast.in(socket.room).emit('message', { message: socket.handshake.session.username + " has changed name to " + username + "."});
			

			socket.handshake.session.username = username;

			usernameList = [];
			for (var sessId in room) {
				usernameList.push(room[sessId].username);
			}
			updateUsers(usernameList);

		} else {
			console.log("User was undefined.");
		}
	});

	socket.on('send', function(msg) {
		var room = rooms[socket.room];
		for (var sessId in room) {
			var user = room[sessId];

			var own = (sessId == socket.handshake.session.id)

			for (var i = 0; i < user.socketIds.length; i++) {

				if (user.socketIds[i] == socket.id)
					continue;
				var sock = io.sockets.connected[user.socketIds[i]];
				sock.emit('message', { message: msg, username: ((own) ? "You" : socket.username), own: own})
			}
			
		}
		//socket.broadcast.in(socket.room).emit('message', {username: socket.username, message: msg });
	});

	socket.on('switchRoom', function (newroom) {
		socket.leave(socket.room);
		rooms[socket.room].splice(rooms[socket.room].indexOf(socket.username), 1);

		socket.join(newroom);
		socket.emit('message', { message: 'You have connected to ' + newroom });

		socket.broadcast.to(socket.room).emit('message', { message: socket.username + " has left this room." });
		socket.room = newroom;
		socket.broadcast.to(newroom).emit('message', { message: socket.username + " has joined this room." });
		//socket.emit('updaterooms', Object.keys(rooms), newroom);
	});

	socket.on('disconnect', function() {

		var sessId = socket.handshake.session.id;
		var socketIds = rooms[socket.room][sessId].socketIds;


		var user = rooms[socket.room][sessId];

		socketIds.splice(socketIds.indexOf(socket.id), 1);
		if (socketIds.length == 0) {
			delete rooms[socket.room][sessId];
			socket.broadcast.in(socket.room).emit('message', { message: socket.username + " has disconnected." });
			//socket.broadcast.emit('updateusers', usernames);
		}

		// Later on we can check and see if the room became empty here

		updateUsers();

		socket.leave(socket.room);
	});


	socket.on('callTestfunction', function() {

		// Allows initiating tests from the browser.
		
		console.log(rooms[socket.room]);
	})

});







console.log("Listening on port " + port);

function contains(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] == obj) {
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

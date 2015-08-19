window.onload = function () {

	var messages = [];
	var socket = io.connect('http://localhost:3700');
	var field = document.getElementById("field");
	var sendButton = document.getElementById("send");
	var content = document.getElementById("content");
	var name = document.getElementById("name");
	var testButton = document.getElementById("testbutton");

	socket.on('connect', function() {
		var nameToUse = (sessionStorage.name) ? sessionStorage.name : name.value;
		name.value = nameToUse;

		socket.emit('join', name.value, "room1");
		//socket.emit('adduser', name.value, "room1");
	});
	socket.on('updateUsername', function(username) {
		name.value = username;
	});

	socket.on('initUsername', function(username, userWasNew) {
		name.value = username;
		if (userWasNew)
			socket.emit('adduser', name.value, "room1");
	});

	var changeUsername = function (newname) {
		socket.emit('changeUsername', newname);
		
	}


	socket.on('message', function (data) {
		appendToChat(data);
	});

	appendToChat = function (data) {
		console.log(data);
		if (data.message) {
			messages.push(data);
			var html = '';
			for (var i = 0; i < messages.length; i++) {
				if (messages[i].username) {
					// Normal user message
					html += createChatBubble(messages[i].username, messages[i].message, messages[i].own);
				} else {
					// Server message

					html += '<div class="serverChatRow">';

					html += '<div class="bubble serverBubble"><span class="serverMessage">'
						+ messages[i].message
						+ '</span></div></div>';
				}
			}
			content.innerHTML = html;
			content.scrollTop = content.scrollHeight;
		} else {
			console.log("There was a problem: ", data);
		}
	}

	switchRoom = function(room) {
		console.log("Switching room to " + room);
		socket.emit('switchRoom', room);
	}

	socket.on('updaterooms', function(rooms, currentRoom) {
		$('#rooms').empty();
		$.each(rooms, function(key, value) {
			if (value== currentRoom) {
				$('#rooms').append('<div>' + value + '</div>');
			} else {
				$('#rooms').append('<div><a href="#" onclick="switchRoom(\''+value+'\')">' + value + '</a></div>');
			}
		});

	});

	socket.on('updateUsersInRoom', function(usernames) {
		$('#users').empty();
		for (var i = 0; i < usernames.length; i++) {
			var username = usernames[i];
			if (username == name.value) {
				$('#users').append('<div><b>' + username + '</b></div>');
			} else {
				$('#users').append('<div>' + username + '</div>');
			}
		}
	})

	var createChatBubble = function (username, message, own) {
		var bubbleClassByUser = (own) ? 'ownChatBubble' : 'chatBubble';
		var rowClassByUser = (own) ? 'ownChatRow' : 'chatRow';
		var html = '<div class="generalRow ' + rowClassByUser + '">';
		html += '<div class="bubble ' + bubbleClassByUser + '"><span class="username"><b>';
		html += username + ': </b></span>';
		html += '</span class="message">' + message + '</span>';
		html += '</div></div>';
		return html;
	}


	testButton.onclick = function() {
		socket.emit('callTestfunction');
	}


	sendButton.onclick = sendMessage = function () {
		console.log("sending message");
		
		var text = field.value;
		var data = {
			message: text,
			username: "You",
			own: true
		}
		socket.emit('send', text);

		field.value = "";
		appendToChat(data);
	}


	$(function () {
		$("#field").keyup(function (e) {
			if (e.keyCode == 13) {
				sendMessage();
			}
		});
		$("#name").keyup(function (e) {
			if (e.keyCode == 13) {
				changeUsername(name.value);
			}
		})
	});
}



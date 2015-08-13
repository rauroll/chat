window.onload = function () {

	var messages = [];
	var socket = io.connect('http://localhost:3700');
	var field = document.getElementById("field");
	var sendButton = document.getElementById("send");
	var content = document.getElementById("content");
	var name = document.getElementById("name");

	socket.on('connect', function() {
		var nameToUse = (sessionStorage.name) ? sessionStorage.name : name.value;
		name.value = nameToUse;

		socket.emit('getUsername', name.value);
		//socket.emit('adduser', name.value, "room1");
	});

	socket.on('initUsername', function(username) {
		name.value = username;
		socket.emit('adduser', name.value, "room1");
	});

	var changeUsername = function (newname) {
		socket.emit('changeUsername', newname);
		appendToChat({ message: "You changed your name to " + newname + "."});
	}


	socket.on('message', function (data) {
		appendToChat(data);
	});

	appendToChat = function (data) {
		if (data.message) {
			messages.push(data);
			var html = '';
			for (var i = 0; i < messages.length; i++) {
				if (messages[i].username) {
					// Normal user message
					html += createChatBubble(messages[i].username, messages[i].message);
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

	var createChatBubble = function (username, message) {
		var bubbleClassByUser = (username == 'You') ? 'ownChatBubble' : 'chatBubble';
		var rowClassByUser = (username == 'You') ? 'ownChatRow' : 'chatRow';
		var html = '<div class="generalRow ' + rowClassByUser + '">';
		html += '<div class="bubble ' + bubbleClassByUser + '"><span class="username"><b>';
		html += username + ': </b></span>';
		html += '</span class="message">' + message + '</span>';
		html += '</div></div>';
		return html;
	}




	sendButton.onclick = sendMessage = function () {
		console.log("sending message");
		
		var text = field.value;
		var data = {
			message: text,
			username: "You"
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



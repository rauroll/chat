function User(username, sessionid, socketid) {
	this.username = username;
	this.sessionId = sessionid;
	this.socketIds = [socketid];
}

User.prototype = new User();
module.exports = User.prototype.constructor = User;



User.prototype.addRoom = function (room) {
	this.rooms.push(room);
}

User.prototype.leaveRoom = function (room) {
	this.rooms.splice(this.rooms.indexOf(room), 1);
}


// Move this under node_modules
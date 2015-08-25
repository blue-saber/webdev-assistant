function WebdevBaseUser (id,auth) {
	this.userid = '';
	this.authenticated = false;
	this.roles = {};

	if (typeof (id) === 'string') {
		this.userid = id;
		this.authenticated = auth;
	} else if (typeof(id) === 'object') {
		this.deserialize (id);
	}
}

WebdevBaseUser.prototype.hasRole = function (role) {
	return this.roles.hasOwnProperty(role);
};

WebdevBaseUser.prototype.addRole = function (role) {
	if (! this.roles.hasOwnProperty(role)) {
		this.roles[role] = true;
	}
};

WebdevBaseUser.prototype.revokeRole = function (role) {
	if (this.roles.hasOwnProperty(role)) {
		delete this.roles[role];
	}
};

WebdevBaseUser.prototype.belongsToAny = function (roles) {
	for (var i = 0; i < roles.length; i++) {
		if (this.hasRole(roles[i])) {
			return true;
		}
	}
	return false;
}

WebdevBaseUser.prototype.deserialize = function (json) {
	for (var prop in this) {
		if (this.hasOwnProperty(prop) && json.hasOwnProperty(prop)) {
			this[prop] = json[prop];
		}
	}
}

WebdevBaseUser.prototype.isAuthenticated = function () {
	return this.authenticated;
};

module.exports = WebdevBaseUser;
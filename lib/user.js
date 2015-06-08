function WebdevBaseUser (id,auth) {
	var self = this;

	this.userid = id;
	this.authenticated = auth;
	this.roles = {};

	this.hasRole = function (role) {
		return self.roles.hasOwnProperty(role);
	};

	this.addRole = function (role) {
		if (! self.roles.hasOwnProperty(role)) {
			self.roles[role] = true;
		}
	};

	this.revokeRole = function (role) {
		if (self.roles.hasOwnProperty(role)) {
			delete self.roles[role];
		}
	};

	this.isAuthenticated = function () {
		return this.authenticated;
	};
}

module.exports = WebdevBaseUser;
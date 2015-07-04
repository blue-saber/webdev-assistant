function WebdevBaseUser (id,auth) {
	this.userid = id;
	this.authenticated = auth;
	this.roles = {};
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

WebdevBaseUser.prototype.isAuthenticated = function () {
	return this.authenticated;
};

module.exports = WebdevBaseUser;
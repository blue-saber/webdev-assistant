'use strict';

var fs = require ('fs');
var UserBaseClass = require('./user');
// var entities_loader = require('./entities_loader');

var anonymousUser = new UserBaseClass('anonymous-user', false);
anonymousUser.addRole('ROLE_ANONYMOUS');

var lut = [];

for (var i=0; i<256; i++) {
	lut[i] = (i<16?'0':'')+(i).toString(16);
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function recursive_find_route (app, basedir, routedir, relpath, prefix) {
    var dir = basedir + routedir + relpath;

    fs.readdirSync(dir).forEach(function(file) { 
        var filepath = dir + "/" + file;
        var stats = fs.statSync(filepath);
        if (stats.isFile()) {
            if (endsWith(file, ".js")) {
                var name = file.substr(0, file.indexOf('.'));
                var r = (name == "index") ? relpath : (relpath + "/" + name);
                r = (r == '') ? '/' : r;
                r = prefix === undefined ? r : prefix + r;

				try {
                	app.use(r, require (dir + "/" + name));
				} catch (e) {
                	console.log("Catch execption while loading: " + r);
					throw e;
				}
            }
        } else if (stats.isDirectory()) {
            recursive_find_route (app, basedir, routedir, relpath + "/" + file);
        }
    });
}

function WebdevAssistant () {
	this.basedir = '';
	this.container = {};
	// this.userClass = undefined;
	// this.currentUserObject = undefined;
	this.authenticationPath = '/signin';
	this.notQualifyPath = '/';
}
	
WebdevAssistant.prototype.setBaseDir = function (basedir) {
	this.basedir = basedir;
};

WebdevAssistant.prototype.setUserClass = function (clazz) {
	this.userClass = clazz;
}

WebdevAssistant.prototype.setAuthenticationPath = function (authpath) {
	this.authenticationPath = authpath;
}

WebdevAssistant.prototype.componentScan = function (options) {
	var self = this;

	for (var key in options) {
		if (options.hasOwnProperty(key)) {
			var element = options[key];
			var d = this.basedir + "/" + key;
			
			fs.readdirSync(d).forEach (
				function (file) {
					if (file.match(element.match)) {
						self.regist (
							file.replace(element.match, element.regist),
							require (d + "/" + file)
						);
					}
				}
			);
		}
	}
};

WebdevAssistant.prototype.loadRoutes = function (app, routedir, prefix) {
	recursive_find_route(app, this.basedir, routedir, '', prefix);
};

WebdevAssistant.prototype.loadEntities = require('./entities_loader');

WebdevAssistant.prototype.require = function (modpath) {
	return require(this.basedir + "/" + modpath);
};

WebdevAssistant.prototype.get = function (key) {
	if (this.container.hasOwnProperty(key)) {
		return this.container[key];
	} else {
		throw new Error(key + " : not found");
	}
};

WebdevAssistant.prototype.regist = function (key, obj) {
	this.container[key] = obj;
};

WebdevAssistant.prototype.getSessionCounter = function (req) {
	return req.session.webapp.counter;
}

WebdevAssistant.prototype.getSessionCounter = function (req) {
	return req.session.webapp.counter;
}

WebdevAssistant.prototype.setSession = function (req, key, value) {
	req.session.webapp[key] = value;
}

WebdevAssistant.prototype.getSession = function (req, key) {
	return req.session.webapp[key];
}

WebdevAssistant.prototype.setMenuHandler = function (app, app_menu) {
	var self = this;

	app.use(function (req, res, next) {
		var currentUser = self.currentUser(req);
		
        var pathlist = req.url.split('/');
        pathlist.shift();
        var menu = app_menu;
        var l3menu = undefined;
		var breadcrumb = [];

        for (var i = 0; i < pathlist.length; i++) {
            var item = pathlist[i];

            if (item in menu) {
            	breadcrumb.push(item);
            	
            	if ('role' in menu[item]) {
            		if (! currentUser.belongsToAny(menu[item].role)) {
            			res.redirect(self.notQualifyPath);
            			return;
            		}
            	}
            	
                if ('sub' in menu[item]) {
                    menu = menu[item].sub;
					if (i == 1) {
						l3menu = menu;
					}
                    continue;
                }
            }
            break;
        }

        if (res.locals) {
            res.locals.app_menu = app_menu;
			res.locals.breadcrumb = breadcrumb;
			if (l3menu !== undefined) {
				res.locals.l3menu = l3menu;
			}
        }

        if (! req.session.webapp) {
        	req.session.webapp = {
        		counter: 1
        	}
        } else {
        	req.session.webapp.counter++;
        }

  //   	if (! req.session.userObj) {
		// 	var anonymous = new UserBaseClass('anonymous-user', false);
		// 	anonymous.addRole('anonymous');

		// 	req.session.userObj = anonymous;
		// 	req.session.authenticate = false;

		// 	self.currentUserObject = anonymous;
		// } else {
		// 	self.currentUserObject = self.clone (req.session.userObj);
		// }


        res.locals.currentUser = currentUser;
        
        // console.log(currentUser);

        next();
    });
};

WebdevAssistant.prototype.get_uuid = function () {
	var d0 = Math.random() * 0xffffffff|0;
	var d1 = Math.random() * 0xffffffff|0;
	var d2 = Math.random() * 0xffffffff|0;
	var d3 = Math.random() * 0xffffffff|0;

	return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
		lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
		lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
		lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
};

WebdevAssistant.prototype.matchRoles = function (roles) {
	var self = this;
	
	return function (req, res, next) {
		var user = self.currentUser(req);
		
		if (user.belongsToAny(roles)) {
			next();
		} else {
			res.redirect(self.notQualifyPath);
		}
	}
}

WebdevAssistant.prototype.isAuthenticated = function (req, res, next) {
	if (next === undefined) {
		return req.user;
	} else {
		if (req.user) {
			next();
		} else {
			res.redirect(this.authenticationPath);
			res.end();
		}
	}
	// if (res !== undefined) {
	// 	if (req.session.authenticate) {
	// 		next();
	// 	} else {
	// 		req.redirect(this.authenticationPath);
	// 	}
	// } else {
	// 	return req.session.authenticate;
	// }
};

WebdevAssistant.prototype.getUserBaseClass = function() {
	return UserBaseClass;
};

WebdevAssistant.prototype.currentUser = function (req) {
	if (req.user) {
		if (! req.webdev_user) {
			req.webdev_user = new this.userClass(req.user);
		}
		return req.webdev_user;
	} else {
		return anonymousUser;
	}
};

// WebdevAssistant.prototype.authenticate = function (req, userid, userObj) {
// 	req.session.authenticate = true;
// 	req.session.userid = userid;
// 	req.session.userObj = userObj;
// };

// WebdevAssistant.prototype.signOut = function (req) {
// 	req.session.authenticate = false;
// 	delete req.session.userObj;
// 	delete req.session.userid;
// };

WebdevAssistant.prototype.getUserId = function (req) {
	return req.user.userid;
};

WebdevAssistant.prototype.getUserObject = function (req) {
	return req.user;
};

WebdevAssistant.prototype.clone = function (from) {
	var obj = new this.userClass(null, false);
	for (var prop in from) {
		if (from.hasOwnProperty(prop)) {
			obj[prop] = from[prop];
		}
	}
	return obj;
}

WebdevAssistant.prototype.logout = function (req) {
	req.logout();

	if (typeof (req.session.destroy) === 'function') {
		req.session.destroy();
	} else {
		// for cookie-based session
		req.session = undefined;
	}
}


module.exports = new WebdevAssistant();

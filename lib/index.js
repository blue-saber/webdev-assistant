'use strict';

var fs = require ('fs');
var UserBaseClass = require('./user');
// var entities_loader = require('./entities_loader');

var anonymousUser = new UserBaseClass('anonymous-user', false);

var lut = [];

for (var i=0; i<256; i++) {
	lut[i] = (i<16?'0':'')+(i).toString(16);
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function recursive_find_route (app, basedir, routedir, relpath) {
    var dir = basedir + routedir + relpath;

    fs.readdirSync(dir).forEach(function(file) { 
        var filepath = dir + "/" + file;
        var stats = fs.statSync(filepath);
        if (stats.isFile()) {
            if (endsWith(file, ".js")) {
                var name = file.substr(0, file.indexOf('.'));
                var r = (name == "index") ? relpath : (relpath + "/" + name);
                r = (r == '') ? '/' : r;

                // console.log("Load Route: " + r);
                app.use(r, require (dir + "/" + name));
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

WebdevAssistant.prototype.loadRoutes = function (app, routedir) {
	recursive_find_route(app, this.basedir, routedir, '');
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

WebdevAssistant.prototype.setMenuHandler = function (app, app_menu) {
	var self = this;

	app.use(function (req, res, next) {
        var pathlist = req.url.split('/');
        pathlist.shift();
        var menu = app_menu;
        var l3menu = undefined;
		var breadcrumb = [];

        for (var i = 0; i < pathlist.length; i++) {
            var item = pathlist[i];

            if (item in menu) {
            	breadcrumb.push(item);
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

  //   	if (! req.session.userObj) {
		// 	var anonymous = new UserBaseClass('anonymous-user', false);
		// 	anonymous.addRole('anonymous');

		// 	req.session.userObj = anonymous;
		// 	req.session.authenticate = false;

		// 	self.currentUserObject = anonymous;
		// } else {
		// 	self.currentUserObject = self.clone (req.session.userObj);
		// }


        res.locals.currentUser = self.currentUser(req);

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

WebdevAssistant.prototype.isAuthenticated = function (req, res, next) {
	if (next === undefined) {
		return req.user;
	} else {
		if (req.user) {
			next();
		} else {
			req.redirect(this.authenticationPath);
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
			req.webdev_user = new UserBaseClass(req.user);
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
	req.session.destroy();
}


module.exports = new WebdevAssistant();

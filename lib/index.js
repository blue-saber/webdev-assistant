'use strict';

var fs = require ('fs');

var lut = [];

for (var i=0; i<256; i++) {
	lut[i] = (i<16?'0':'')+(i).toString(16);
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function recursive_find_route (app, basedir, routedir, path) {
    var dir = basedir + routedir + path;

    fs.readdirSync(dir).forEach(function(file) { 
        var filepath = dir + "/" + file;
        var stats = fs.statSync(filepath);
        if (stats.isFile()) {
            if (endsWith(file, ".js")) {
                var name = file.substr(0, file.indexOf('.'));
                var r = (name == "index") ? path : (path + "/" + name);
                r = (r == '') ? '/' : r;

                app.use(r, require (dir + "/" + name));
            }
        } else if (stats.isDirectory()) {
            recursive_find_route (app, basedir, routedir, path + "/" + file);
        }
    });
}

function WebdevAssistant () {
	var self = this;
	this.basedir = '';
	this.container = {};
	
	this.setBaseDir = function (basedir) {
		self.basedir = basedir;
	}
	
	this.componentScan = function (options) {
		for (var key in options) {
			if (options.hasOwnProperty(key)) {
				var element = options[key];
				var d = self.basedir + "/" + key;
				
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
	}
	
	this.loadRoutes = function (app, routedir) {
		recursive_find_route(app, self.basedir, routedir, '');
	}
	
	this.require = function(modpath) {
		return require(self.basedir + "/" + modpath);
	}

	this.get = function (key) {
		if (self.container.hasOwnProperty(key)) {
			return self.container[key];
		} else {
			throw new Error(key + " : not found");
		}
	}

	this.regist = function (key, obj) {
		self.container[key] = obj;
	}

	this.setMenuHandler = function (app, app_menu) {
		app.use(function (req, res, next) {
	        var pathlist = req.url.split('/');
	        pathlist.shift();
	        var menu = app_menu;
	        for (var i = 0; i < pathlist.length; i++) {
	            var item = pathlist[i];
	            if (item in menu) {
	                if ('sub' in menu[item]) {
	                    menu = menu[item].sub;
	                    continue;
	                }
	            }
	            break;
	        }

	        if (res.locals) {
	            res.locals.app_menu = app_menu;
	        }

	        next();
	    });
	}

	this.get_uuid = function () {
		var d0 = Math.random() * 0xffffffff|0;
		var d1 = Math.random() * 0xffffffff|0;
		var d2 = Math.random() * 0xffffffff|0;
		var d3 = Math.random() * 0xffffffff|0;

		return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
			lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
			lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
			lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
	}
}

module.exports = new WebdevAssistant();

'use strict';

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");

function entities_loader(config, entities_path) {
	var db = {};

	fs.readdirSync(entities_path).filter(function(file) {
		return fs.lstatSync(path.join(entities_path, file)).isDirectory() && config.hasOwnProperty(file);
	}).forEach(function (dbtag) {
		var entityPath = path.join(entities_path, dbtag);
		var sequelize = new Sequelize(config[dbtag].database, config[dbtag].username, config[dbtag].password, config[dbtag]);
		db[dbtag] = {};

		fs.readdirSync(entityPath).filter(function(file) {
			return (file.indexOf(".") !== 0) && (file !== "index.js") && (file.indexOf(".js") > 0);
		}).forEach(function(file) {
			var model = sequelize["import"](path.join(entityPath, file));
	    	db[dbtag][model.name] = model;
		});

	    Object.keys(db[dbtag]).forEach(function(modelName) {
			if ("associate" in db[dbtag][modelName]) {
				db[dbtag][modelName].associate(db[dbtag]);
		    }
		});

		// for (var m in db[dbtag]) {
		// 	if (db[dbtag].hasOwnProperty(m)) {
		// 		db[dbtag][m].sync();
		// 	}
		// }

		db[dbtag].sequelize = sequelize;
		db[dbtag].Sequelize = Sequelize;
	});

	return db;
}

module.exports = entities_loader;
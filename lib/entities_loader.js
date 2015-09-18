'use strict';

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");

function entities_loader(config, entities_path) {
	var db = {};


	// if (fs.lstatSync(path.join(entities_path, 'index.js')).isFile()) {
	// 	var files = require()
	// }

	fs.readdirSync(entities_path).filter(function(file) {
		return fs.lstatSync(path.join(entities_path, file)).isDirectory() && config.hasOwnProperty(file);
	}).forEach(function (dbtag) {
		var entityPath = path.join(entities_path, dbtag);
		var sequelize = new Sequelize(config[dbtag].database, config[dbtag].username, config[dbtag].password, config[dbtag]);
		
		db[dbtag] = {
			sequelize: sequelize,
			Sequelize: Sequelize
		};

		var loading_order = [];
		var delay_loading_files = {};

		try {
			if (fs.lstatSync(path.join(entityPath, 'index.js')).isFile()) {
				loading_order = require(entityPath);
			}
		} catch (err) {
		}

		loading_order.forEach(function (file) {
			delay_loading_files[file + '.js'] = true;
		});

		fs.readdirSync(entityPath).filter(function(file) {
			return (file.indexOf(".") !== 0) && (file !== "index.js") 
					&& (file.indexOf(".js") > 0) 
					&& (! delay_loading_files.hasOwnProperty(file));
		}).forEach(function(file) {
			console.log("Loading " + file);
			var model = sequelize.import(path.join(entityPath, file));
	    	db[dbtag][model.name] = model;
		});

		loading_order.forEach(function (file) {
				console.log("Dependence Loading " + file);
				var model = require(path.join(entityPath, file))(sequelize, Sequelize, db[dbtag]);
		    	db[dbtag][model.name] = model;
		});

	    Object.keys(db[dbtag]).forEach(function(modelName) {
			if ("associate" in db[dbtag][modelName]) {
				console.log("Associate " + modelName);
				db[dbtag][modelName].associate(db[dbtag]);
		    }
		});

		// db[dbtag].sequelize = sequelize;
		// db[dbtag].Sequelize = Sequelize;
	});


	return db;
}

module.exports = entities_loader;
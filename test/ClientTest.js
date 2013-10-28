var Seaport = require("seaport"),
	LOG = require("winston"),
	Server = require("../lib/Server"),
	Client = require("../lib/Client");

module.exports["Client"] = {
	"Should find a seaport server": function( test ) {
		var name = Math.random().toString(36).substring(2, 17);

		var seaport = Seaport.createServer();
		seaport.listen();

		var server = new Server({
			serviceType: name
		});
		server.publish(seaport);

		// make sure we don't wait forever..
		var panicButton = setTimeout(function() {
			test.fail("seaport server start was not detected");

			seaport.close();
			client.stop();

			test.done();
		}, 10000);

		var client = new Client({
			serviceType: name
		});
		client.find(function() {
			clearTimeout(panicButton);

			seaport.close();

			client.stop();

			test.done();
		});
	},

	"Should register a service with a seaport server": function( test ) {
		var name = Math.random().toString(36).substring(2, 17);

		var seaport = Seaport.createServer();
		seaport.listen();

		var server = new Server({
			serviceType: name
		});
		server.publish(seaport);

		// make sure we don't wait forever..
		var panicButton = setTimeout(function() {
			test.fail("Did not create service in time");

			seaport.close();
			client.stop();

			test.done();
		}, 10000);

		var client = new Client({
			serviceType: name
		});
		client.register({
			role: "a role",
			version: "1.0.0",
			createService: function() {
				clearTimeout(panicButton);

				client.stop();
				seaport.close();

				test.done();
			}
		});
	},

	"Should only create service once when seaport disappears and reappears": function( test ) {
		var name = Math.random().toString(36).substring(2, 17);

		var seaport = Seaport.createServer();
		seaport.listen();

		var server = new Server({
			serviceType: name
		});
		server.publish(seaport);

		// make sure we don't wait forever..
		var panicButton = setTimeout(function() {
			test.fail("Did not create service once when seaport disappears and reappears");
			browser.stop();
			server.close();
			test.done();
		}, 10000);

		var timesCreated = 0;

		var client = new Client({
			serviceType: name
		});
		client.register({
			role: "a role",
			version: "1.0.0",
			createService: function() {
				timesCreated++;

				if(timesCreated == 2) {
					test.fail("Service has been created too many times!");
				}
			}
		});

		var timesAppeared = 0;

		client.on("seaportUp", function(info) {
			timesAppeared++;

			if(timesAppeared == 1) {
				LOG.info("Test", "Seaport came up, going to restart it");
				// wait a little bit, then restart seaport
				setTimeout(function() {
					seaport.close();
				}, 1000);

				setTimeout(function() {
					seaport.listen();
				}, 3000);
			}

			if(timesAppeared == 2) {
				LOG.info("Test", "Server came up again");
				clearTimeout(panicButton);

				client.stop();
				seaport.close();

				test.done();
			}
		});
	}
};

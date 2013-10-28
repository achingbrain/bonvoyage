var Server = require("../lib/Server"),
	Seaport = require("seaport"),
	mdns = require("mdns2");

module.exports["Server"] = {
	"Should create and advertise a seaport server": function( test ) {
		var name = Math.random().toString(36).substring(2, 17);

		var seaport = Seaport.createServer();
		seaport.listen();

		var server = new Server({
			serviceType: name
		});
		server.publish(seaport);

		var browser = new mdns.Browser(mdns.tcp(name));

		// make sure we don't wait forever..
		var panicButton = setTimeout(function() {
			test.fail("seaport server start was not detected");

			seaport.close();
			browser.stop();

			test.done();
		}, 10000);

		browser.once("serviceUp", function(info) {
			clearTimeout(panicButton);

			seaport.close();
			browser.stop();

			test.done();
		});

		browser.start();
	}
};

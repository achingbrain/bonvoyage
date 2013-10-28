# bonvoyage [![Dependency Status](https://david-dm.org/achingbrain/bonvoyage.png)](https://david-dm.org/achingbrain/bonvoyage)

[seaport](https://github.com/substack/seaport) is a great service for service discovery on a network, but how do you find the seaport server?  Enter [mDNS](http://en.wikipedia.org/wiki/Multicast_DNS) - this lets us broadcast the availability of a seaport server on the network.

## Server

To advertise a seaport server, do the following:

```javascript
var Seaport = require("seaport"),
	bonvoyage = require("bonvoyage");

// start seaport
var seaport = Seaport.createServer();
seaport.listen();

// publish bonvoyage advert
var bonvoyageServer = new bonvoyage.Server();
bonvoyageServer.publish(seaport);
```

## Client

To register a service with a seaport server, do the following:

```javascript
var bonvoyage = require("bonvoyage");

var bonvoyageClient = new bonvoyage.Client();
bonvoyageClient.register({
	role: "http",
	version: "1.0.0",
	createService: function(port) {
		var restServer = container.find("restServer");
		restServer.start(port);
	}
});
```

If seaport goes away and comes back, the service will be re-registered automagically on the same port with the same role and version without being re-created.

To find a seaport server, do the following:

```javascript
var bonvoyage = require("bonvoyage");

var bonvoyageClient = new bonvoyage.Client();
bonvoyageClient.find(function(seaport) {

	// found seaport, now use it as normal
	seaport.get('http@1.0.x', function (services) {
		console.info("http://" + services[0].host + ":" + services[0].port);
	});
});
```

This will fire once when a seaport server is found on the network.

To be notified when seaport goes away and comes back, listen on the client for `seaportUp` and `seaportDown` events.
var defaults = require("defaults"),
	Seaport = require("seaport"),
	mdns = require("mdns2"),
	LOG = require("winston"),
	events = require("events"),
	util = require("util");

var Client = function(options) {
	this._options = defaults(options, {
		serviceType: "seaport",

		// regex to apply to interfaces - match en0 or eth0 but not vnic0 or ppp0
		interfaceRegex: /^(e[n|th][0-9])|(lo0)/,

		// how long Client.find should wait for seaport to appear before aborting
		findTimeout: 5000
	});

	this._seaport;

	var resolvedServices = {};

	var serviceXTimeoutLength = 500;
	var serviceUpTimeout;
	var serviceDownTimeout;

	// mdns browser to listen for seaport availability
	this._browser = new mdns.Browser(mdns.tcp(this._options.serviceType));
	this._browser.on("serviceUp", function(info) {
		if(resolvedServices[info.networkInterface] && resolvedServices[info.networkInterface].host === info.host && resolvedServices[info.networkInterface].port == info.port) {
			LOG.debug("Service came up on", info.networkInterface, "again");

			// already seen this one
			return;
		}

		if(!info.networkInterface.match(this._options.interfaceRegex)) {
			LOG.debug("Service came up on", info.networkInterface, "but ignoring it");

			// not interested in this one
			return;
		}

		resolvedServices[info.networkInterface] = {
			host: info.host,
			port: info.port
		};

		if(serviceUpTimeout) {
			clearTimeout(serviceUpTimeout);
		}

		// thanks Avahi, for not supporting kDNSServiceFlagsMoreComing
		serviceUpTimeout = setTimeout(function() {
			// got all the seaports, select one to connect to
			for(var networkInterface in resolvedServices) {
				// don't use made up interfaces like vnic0, etc
				if(networkInterface.match(this._options.interfaceRegex)) {
					var service = resolvedServices[networkInterface];

					LOG.log("info", "BonVoyage Seaport up - %s://%s:%d (%s)", this._options.serviceType, service.host, service.port, networkInterface);
					this._seaport = Seaport.connect(service.port, service.host);

					break;
				}
			}

			if(this._seaport) {
				this.emit("seaportUp", this._seaport);
			} else {
				LOG.warn("Found seaport services on interfaces", Object.keys(resolvedServices), "but none were eligible.  Please pass a different regex in to Client constructor as interfaceRegex");
			}
		}.bind(this), serviceXTimeoutLength);
	}.bind(this));
	this._browser.on("serviceDown", function(info) {
		if(!resolvedServices[info.networkInterface]) {
			LOG.debug("Service went down on", info.networkInterface, "but ignoring it");

			// not interested in this interface
			return;
		}

		if(serviceDownTimeout) {
			clearTimeout(serviceDownTimeout);
		}

		// thanks Avahi, for not support kDNSServiceFlagsMoreComing
		serviceDownTimeout = setTimeout(function() {
			delete resolvedServices[info.networkInterface];

			if(Object.keys(resolvedServices).length != 0) {
				// there are still services available
				return;
			}

			LOG.info("BonVoyage", "Seaport down", "(" + info.networkInterface + ")");

			this._seaport.close();

			this.emit("seaportDown");
		}.bind(this), serviceXTimeoutLength);
	}.bind(this));
	this._browser.on("error", function(error) {
		this.emit("error", error);
	}.bind(this));
	this._browser.start();
};
util.inherits(Client, events.EventEmitter);

/**
 * Invokes the passed callback once when a seaport server is available.
 */
Client.prototype.find = function(callback) {
	if(this._seaport) {
		callback(null, this._seaport);
	} else {
		var timeout = setTimeout(function() {
			callback(new Error("Did not find seaport within " + this._options.findTimeout + "ms"));
		}.bind(this), this._options.findTimeout);

		this.once("seaportUp", function() {
			clearTimeout(timeout);

			callback(null, this._seaport);
		}.bind(this));
	}
};

/**
 * Registers a service with seaport when it's available.
 */
Client.prototype.register = function(options) {
	this.on("seaportUp", this._createService.bind(this, options));
};

/**
 * Stops listening for seaport servers coming and going.
 */
Client.prototype.stop = function() {
	if(this._seaport) {
		this._seaport.close();
	}

	this._browser.stop();
};

Client.prototype._createService = function(options, seaport) {
	var opts = defaults(options, {
		role: "a role",
		version: "1.0.0",
		host: null, // to override published host name
		port: null, // to override magic port
		createdService: false,
		createService: function(port, seaport) {
			// should create the service running on the passed port
		}
	});

	if(opts.createdService) {
		seaport.register(opts.role, opts);
	} else {
		opts.port = seaport.register(opts.role, opts);
		opts.createService(opts.port, seaport);
		opts.createdService = true;
	}
};

module.exports = Client;

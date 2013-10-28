var defaults = require("defaults"),
	mdns = require("mdns2"),
	LOG = require("winston");

var Server = function(options) {
	this._options = defaults(options, {
		serviceType: "seaport"
	});
};

/**
 * Advertise a seaport server via mdns.
 */
Server.prototype.publish = function(seaport) {
	seaport.on("listening", function() {
		if(!seaport.address()) {
			LOG.warn("BonVoyage", "Cannot start seaport advertisement when seaport doesn't know what port it's listening on..");

			return;
		}

		this._startAdvert(seaport.address().port);
	}.bind(this));
	seaport.on("close", this._stopAdvert.bind(this));
};

Server.prototype._startAdvert = function(port) {
	LOG.info("BonVoyage", "Starting MDNS advertisement for", this._options.serviceType);
	this._advert = mdns.createAdvertisement(mdns.tcp(this._options.serviceType), port, {
		name: this._options.name
	});
	this._advert.start();
}

Server.prototype._stopAdvert = function() {
	if(!this._advert) {
		return;
	}

	LOG.info("BonVoyage", "Shutting down MDNS advertisement for", this._options.serviceType);
	this._advert.stop();
}

module.exports = Server;
'use strict';

var module = angular.module('geolocation', []);

module.factory('Geolocation', ['$q', '$window', function($q, $window) {
    var self = this,
		r = 6371000,
		edinburghCentre = {coords : {latitude: '55.9410655', longitude: '-3.2053836'}, denied: true},
		timer;
	
	this.deferred = $q.defer();
	
    this.config = {
        enableHighAccuracy: true,
        maximumAge: 5000
    };

	this.success = function(position) {
		clearTimeout(timer);
		self.deferred.resolve(position);
	};
		
	this.error = function(error) {
		clearTimeout(timer);
		//resolve location as the centre of edinbugh
		self.deferred.resolve(edinburghCentre);
	};
	
    /**
     * get one time geolocation
     * @param callback
     */
    this.getLocation = function() {
		if ($window.navigator && $window.navigator.geolocation) {
			timer = setTimeout(self.error, 6000);
			$window.navigator.geolocation.getCurrentPosition(self.success, self.error, self.config);
		} else {
			self.error('Unsupported browser');
		}
		return self.deferred.promise;
    };
	
	
	/**
     * calculate distance
     * @param geo1
     * @param geo2
     * @returns {Number}
     */
    this.calculateDistance = function(geo1, geo2) {
        var a, c,
			dLat = self.toRad(geo1.latitude - +geo2.latitude),
			dLon = self.toRad(geo1.longitude - +geo2.longitude),
			lat1 = self.toRad(+geo2.latitude),
			lat2 = self.toRad(geo1.latitude);
		a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
		c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return self.metresToMiles(parseInt(r * c)).toFixed(2);
    };
    
	
	this.metresToMiles = function (m) {
		return m * 0.000621371192;
	};
	
    /**
     * math util to convert lat/long to radians
     * @param value
     * @returns {number}
     */
    this.toRad = function(value) {
        return value * Math.PI / 180;
    };

    /**
     * math util to convert radians to latlong/degrees
     * @param value
     * @returns {number}
     */
    this.toDeg = function(value) {
        return value * 180 / Math.PI;
    };
	
	
	
	return this;
}]);
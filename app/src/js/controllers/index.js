/*global console, angular, navigator*/
'use strict';

var cbeControllers = angular.module('cbeControllers', [])
	
	.controller('CbeAppController', ['$scope', 'Modernizr', '$location', 'Geolocation', '$window', 'DataService', 'Map', '$q', function($scope, Modernizr, $location, Geolocation, $window, DataService, Map, $q) {
		
		//Modernizr feature detect
		 $scope.browser = {
			flexbox: Modernizr.flexbox,
			svg: Modernizr.svg
		};
		
		//detect if online
		if (!navigator.onLine) {
		  $scope.offline = true;
		}
		//are we reloading?
		$scope.reloading = false;
		
		//loading status
		$scope.loaded = {
			data : false,
			geo : false,
			map : false,
			failed : false,
			message: 'Loading data...'
		};
		
		//initialize filter states
		$scope.filterOn = false;
		$scope.stringFilter = '';
		$scope.typeFilter = '';

		//get data from json source
		DataService.query(function(locations) {
			var promises = [],
				position;
			
			//get geoloation and google map API
			promises.push(Geolocation.getLocation());
			promises.push(Map.asyncGoogleMapAPI());
			$scope.loaded.message = 'Getting geolocation information...';
			$q.$allSettled(promises).then(function(results) {
				position = results[0];
				if (position.coords) {
					if(!position.denied) {
						$scope.loaded.geo = true;
						$scope.person = {
							latitude: position.coords.latitude,
							longitude: position.coords.longitude,
							type: 'person',
							id: 'Person'
						};
					}
					//get distance to each location from current position and add to location object
					locations.map(function(location) { 
						location.distance = Geolocation.calculateDistance(position.coords, {'latitude': location.latitude, 'longitude' : location.longitude});
						return location;
					});
					//sort by distance, ascending
					locations.sort(function(a,b) { return parseFloat(a.distance) - parseFloat(b.distance); } );
				}
				$scope.loaded.map = true;
				$scope.locations = locations;
				$scope.loaded.data = true;
				$scope.loaded.message = '';
				
				$scope.$broadcast('asyncComplete');
			}, 
			function(results) { 
				//not DRY, refactor
				position = results[0];
				if (position.coords) {
					if(!position.denied) {
						$scope.loaded.geo = true;
						$scope.person = {
							latitude: position.coords.latitude,
							longitude: position.coords.longitude,
							type: 'person',
							id: 'Person'
						};
					}
					//get distance to each location from current position and add to location object
					locations.map(function(location) { 
						location.distance = Geolocation.calculateDistance(position.coords, {'latitude': location.latitude, 'longitude' : location.longitude});
						return location;
					});
					//sort by distance, ascending
					locations.sort(function(a,b) { return parseFloat(a.distance) - parseFloat(b.distance); } );
				}
				$scope.loaded.message = 'Geolocation failed. You can still use the list of craft beer bars and off-licenses.';
				$scope.locations = locations;
				$scope.loaded.data = true;
				$scope.loaded.message = '';
			});
		}, function(error) {
			$scope.loaded.message = 'Oops, the data failed to load. Please try again.';
			$scope.loaded.failed = true;
		});
		
		//refactor this
		$scope.typeFilterSelect = function(filter) {
			if (filter === $scope.typeFilter) {
				$scope.typeFilter = undefined;
			} else {
				$scope.typeFilter = filter;
			}
		};
		$scope.toggleFilter = function() {
			$scope.filterOn = !$scope.filterOn;
			if (!$scope.filterOn) {
				$scope.typeFilter = $scope.stringFilter = undefined;
			}
		};
		$scope.filterable = function() {
			return ($location.path() === '/list' || $location.path() === '/map');
		};

		
		$scope.navIsActive = function(path) {
			return (path === $location.path());
		};

		$scope.back = function() {
			$window.history.back();
		};

	}])

	//List page
	.controller('CbeListController', ['$scope', function($scope) {}])

	//Details page
	.controller('CbeDetailsController', ['$scope', '$routeParams', function($scope, $routeParams){
		if($scope.loaded.data) {
			$scope.location = $scope.locations.filter(function(l) { return l.id === $routeParams.locationId; })[0];
			$scope.facilities = $scope.location.facilities ? $scope.location.facilities.split(' ') : false;
		} else {
			$scope.$on('asyncComplete', function() {
				$scope.location = $scope.locations.filter(function(l) { return l.id === $routeParams.locationId; })[0];
				$scope.facilities = $scope.location.facilities ? $scope.location.facilities.split(' ') : false;
			});
		}
	}])

	//Map page
	.controller('CbeMapController', ['$scope', 'Geolocation', 'Map', '$routeParams', function($scope, Geolocation, Map, $routeParams) {
		var markers,
			loadMap = function(d) {
				var mapVars = {
					locations : (!!$routeParams.locationId ? d.filter(function (l) { return l.id === $routeParams.locationId; }).splice(0,1) : d),
					person: (!!$scope.loaded.geo && $scope.person) || null,
					trigger: !!$routeParams.locationId
				};
				Map.init(mapVars);
			},
			initFilter = function(locations) {
				$scope.$watch('[stringFilter, typeFilter]', function(newV, oldV) {
					var filteredLocations = $scope.locations;
						
					if ($scope.stringFilter !== undefined && $scope.stringFilter !== '' && $scope.stringFilter !== undefined) {
						filteredLocations = filteredLocations.filter(function(l) {
							var re = new RegExp($scope.stringFilter, 'gi');
							return (l.name.match(re) || l.description.long.match(re) || l.address.match(re));
						});
					}
					if ($scope.typeFilter !== '' && $scope.typeFilter !== undefined) {
						filteredLocations = filteredLocations.filter(function(l) {
							return l.type === $scope.typeFilter;
						});
					}
					
					Map.refresh({
						locations : filteredLocations,
						person: (!!$scope.loaded.geo && $scope.person) || null
					});
				});
			};
		if($scope.loaded.data) {
			loadMap($scope.locations);
			!$routeParams.locationId && initFilter($scope.locations);
			
		} else {
			$scope.$on('asyncComplete', function() {
				loadMap($scope.locations);
				!$routeParams.locationId && initFilter($scope.locations);
			});
		}
		
	}]);
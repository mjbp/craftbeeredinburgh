/*global console, angular, navigator*/
'use strict';

var cbeControllers = angular.module('cbeControllers', [])

	.controller('CbeAppController', ['$scope', '$location', 'Geolocation', '$window', 'DataService', 'Map', '$q', function($scope, $location, Geolocation, $window, DataService, Map, $q) {
		if (!navigator.onLine) {
		  $scope.offline = true;
		}
		$scope.reloading = false;
		
		$scope.loaded = {
			data : false,
			geo : false,
			failed : false,
			message: 'Loading data...'
		};

		$scope.filterOn = false;
		$scope.stringFilter = '';
		$scope.typeFilter = '';

		DataService.query(function(locations) {
			var promises = [],
				position;

			promises.push(Geolocation.getLocation());
			promises.push(Map.asyncGoogleMapAPI());
			$scope.loaded.message = 'Finding your location...';
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
				$scope.locations = locations;
				$scope.loaded.data = true;
				$scope.loaded.message = '';

				//refactor
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

				$scope.$broadcast('asyncComplete');
			}, 
			function(results) { 
				console.log('allSettled failed'); 
			});
		}, function(error) {
			$scope.loaded.failed = true;
		});

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
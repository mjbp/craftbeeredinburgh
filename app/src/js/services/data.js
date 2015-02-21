var module = angular.module('dataService', ['ngResource']);

module.factory('DataService', ['$resource', function($resource){
    return $resource('assets/data/data.min.json',{ }, {
    	getData: {method:'GET', isArray: true, cache : true}
  	});
 }]);
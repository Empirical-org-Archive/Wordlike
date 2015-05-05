var app = angular.module("synonymTool", ["firebase"]);

app.controller("ToolCtrl", ['$scope', '$http', '$interval', '$firebase', '$firebaseObject', '$firebaseArray', function ($scope, $http, $interval, $firebase, $firebaseObject, $firebaseArray) {

	$scope.synonyms = [];
	$scope.data = '{"data": [{';

	var firstEntry = true;

	$scope.addSynonym = function(){

		$scope.synonyms.push($scope.synonymInput);
		$scope.synonymInput = '';
	}

	$scope.addEntry = function(){

		var entry = '';

		if(!firstEntry){

			entry = ', ';
		};

		entry += '"word":"' + $scope.wordInput + '", "definition":"' + $scope.definitionInput + '", "synonyms": [';

		var firstSyn = true;

		for (var i = $scope.synonyms.length - 1; i >= 0; i--) {
			
			if(!firstSyn){

				entry += ', ';
			};

			entry += '{"syn":"' + $scope.synonyms[i] + '"}'
			firstSyn = false;
		};

		entry += ']}';

		$scope.data += entry;

		firstEntry = false;
		$scope.wordInput = '';
		$scope.definitionInput = '';
		$scope.synonyms = [];
	}

	$scope.finish = function(){

		$scope.data += ']}';
	}
}]);


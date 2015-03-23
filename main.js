var app = angular.module("synonymApp", []);

app.run(function ($templateCache){

	$templateCache.put('synonym-mini-game.html', '<div><input type="text" ng-model="input"><button ng-click="fetchData()">Fetch words (nouns are the default result for now)</button><ul><li ng-repeat="word in words">{{word}}</li></ul><div ng-show="toShow"><input type="text" ng-model="input2"><button ng-click="compare()">Compare to the list</button><h1>{{status}}</h1></div></div>');
});

app.controller("AppCtrl", ['$scope', '$http', function ($scope, $http) {

	//var URL = "https://api.wordnik.com/v4/word.json/"; //Wordnik
	var URL = "https://words.bighugelabs.com/api/2/"; //BigHugeThesaurus

	//var filter = "/relatedWords?useCanonical=false&relationshipTypes=synonym&limitPerRelationshipType=20&api_key="; //Wordnik

	//Demo keys
	//var api_key = "a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5"; //Wordnik

	var api_key = "de3464d869cd5c75f999b6e8ac430fb6"; //BigHugeThesaurus

	var failures = 0;

	$scope.fetchData = function() {

		//Wordnik
		// $http.get(URL + $scope.input + filter + api_key)
		// .success(function(response) {
		// 	$scope.wordlist = response[0].words;
		// 	$scope.words = [];

		// 	for (var i = $scope.wordlist.length - 1; i >= 0; i--) {
		// 		$scope.words[i] = i + 1;
		// 	};

		// 	$scope.toShow = true;

		// 	$scope.status = '';
		// 	failures = 0;
		// });

		//BigHugeThesaurus
		$http.get(URL + api_key + "/" + $scope.input + "/json")
			.success(function(response) {
				$scope.wordlist = response.noun.syn;
				$scope.words = [];

				for (var i = $scope.wordlist.length - 1; i >= 0; i--) {
					$scope.words[i] = i + 1;
				};

				$scope.toShow = true;

				$scope.status = '';
				failures = 0;
			});
		};

	$scope.compare = function() {

		for (var i = $scope.wordlist.length - 1; i >= 0; i--) {
			if($scope.wordlist[i] == $scope.input2) {

				$scope.status = "Success!";
				$scope.words[i] = $scope.wordlist[i];
				return;
			}
		};

		//Only reaches this point if a hit was not found
		if(failures < 4){

				failures++;
				$scope.status = "Failure...";
		}
		else {
			$scope.status = "Failed five times. Revealing answers";
			$scope.words = $scope.wordlist;
		}
	};
	
}]);

app.directive('appdir', function ($templateCache) {

	return {
		restrict: 'E',
		template: $templateCache.get('synonym-mini-game.html')
	};
});
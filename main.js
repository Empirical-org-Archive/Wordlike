var app = angular.module("synonymApp", []);

app.run(function ($templateCache){

	$templateCache.put('synonym-mini-game.html', '<div class="column-left"><div style="border-style:solid; border-width:1px; padding-top:5px; padding-bottom:5px;">Words Found</div><div style="border-style:solid; border-width:1px"><ul><li ng-repeat="word in words">{{word}}</li></ul></div></div><div class="column-center"><h1>{{input}}</h1><p>{{definition}}</p><input type="text" ng-model="input"><button ng-click="fetchData()">Fetch words (nouns are the default result for now)</button><div ng-show="toShow"><input type="text" ng-model="input2"><button ng-click="compare()">Compare to the list</button><h1>{{status}}</h1></div></div><div class="column-right"><div style="border-style:solid; border-width:1px; padding-top:10px; padding-bottom:10px">{{points}} Points</div>');
});

app.controller("AppCtrl", ['$scope', '$http', function ($scope, $http) {

	var URL = "https://api.wordnik.com/v4/word.json/"; //Wordnik
	var URL2 = "https://words.bighugelabs.com/api/2/"; //BigHugeThesaurus

	var filter = "/definitions?limit=200&includeRelated=true&useCanonical=false&includeTags=false&api_key="; //Wordnik

	//Demo keys
	var api_key = "a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5"; //Wordnik

	var api_key2 = "de3464d869cd5c75f999b6e8ac430fb6"; //BigHugeThesaurus

	var failures = 0;

	$scope.points = 0;
	$scope.runTimer = {value: false};

	$scope.fetchData = function() {

		//Wordnik
		 $http.get(URL + $scope.input + filter + api_key)
		 .success(function(response) {
		 	if(response[0]) {
		 		$scope.definition = response[0].text;
		 	}
		 	else {
		 		$scope.definition = "That is not a word. Try again."
		 	}

		 	$scope.runTimer = {value: true};
		 });

		//BigHugeThesaurus
		$http.get(URL2 + api_key2 + "/" + $scope.input + "/json")
			.success(function(response) {
				$scope.wordlist = response.noun.syn;
				$scope.words = [];

				for (var i = response.noun.syn.length - 1; i >= 0; i--) {
					$scope.words[i] = {word: response.noun.syn[i], show: false, strike: false};
				};

				$scope.toShow = true;

				$scope.status = '';
				failures = 0;
			});
		};

	$scope.compare = function() {

		for (var i = $scope.words.length - 1; i >= 0; i--) {
			if($scope.words[i].word == $scope.input2) {

				if(!$scope.words[i].show){
					$scope.status = "Success!";
					$scope.words[i].show = true;
					$scope.words[i].strike = true;
					$scope.points += 5;
					return;
				}
				else if($scope.words[i].show && !$scope.words[i].strike){
					$scope.status = "Good job!";
					$scope.words[i].strike = true;
					$scope.points += 1;
					return;
				}
				else {
					$scope.status = "You entered that word already. Try again.";
					return;
				}
			}
		};

		//Only reaches this point if a hit was not found
		if(failures < 4){

				failures++;
				$scope.status = "Failure...";
		}
		else {
			$scope.status = "Failed five times. Revealing answers";

			for (var i = $scope.words.length - 1; i >= 0; i--) {
				
				if(!$scope.words[i].show) {
					$scope.words[i].show = true;
				}
			};
		}
	};

	$scope.outOfTime = function() {

		$scope.status = "Out of time. Revealing answers.";

		for (var i = $scope.words.length - 1; i >= 0; i--) {
			
			if(!$scope.words[i].show) {
				$scope.words[i].show = true;
			}
		};
	}
}]);

app.directive('appdir', function ($templateCache) {

	return {
		restrict: 'E',
		//template: $templateCache.get('synonym-mini-game.html')
		templateUrl: 'synonym-template.html'
	};
});

app.directive('timer', ['$interval', function ($interval) {

	return {
		restrict: 'E',
		scope : {start: '=', onDone:'=', run: '='},
		template: '<span style="float:right">{{seconds}} seconds left</span>',
		link: function(scope, elem, attrs) {

			scope.seconds = attrs.start;

      var intervalPromise = null;

			var tick = function() {
        console.log(scope.run);
        if (scope.run && scope.run.value) {
				  scope.seconds--;
        }

				if(scope.seconds === 0) {
          $interval.cancel(intervalPromise);
					scope.onDone();
					return;
				}
			}

      intervalPromise = $interval(tick, 1000);


		}
	};
}]);

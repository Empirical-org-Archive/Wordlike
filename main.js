var app = angular.module("synonymApp", ["firebase"]);

app.run(function ($templateCache){

	$templateCache.put('synonym-mini-game.html', '<div class="column-left"><div style="border-style:solid; border-width:1px; padding-top:5px; padding-bottom:5px;">Words Found</div><div style="border-style:solid; border-width:1px"><ul><li ng-repeat="word in words">{{word}}</li></ul></div></div><div class="column-center"><h1>{{input}}</h1><p>{{definition}}</p><input type="text" ng-model="input"><button ng-click="fetchData()">Fetch words (nouns are the default result for now)</button><div ng-show="toShow"><input type="text" ng-model="input2"><button ng-click="compare()">Compare to the list</button><h1>{{status}}</h1></div></div><div class="column-right"><div style="border-style:solid; border-width:1px; padding-top:10px; padding-bottom:10px">{{points}} Points</div>');
});

app.controller("AppCtrl", ['$scope', '$http', '$interval', '$firebase', '$firebaseObject', '$firebaseArray', function ($scope, $http, $interval, $firebase, $firebaseObject, $firebaseArray) {

	$scope.userid = Math.round(Math.random() * 586);
	$scope.animals = [];

	$http.get("animals.json").success(function(response) { $scope.animals = response.data; });

	var amOnline = new Firebase('https://synonymtest1.firebaseio.com/.info/connected');
	var presenceRef = new Firebase('https://synonymtest1.firebaseio.com/presence/');
	var userRef = presenceRef.push();

	var roomRef = new Firebase('https://synonymtest1.firebaseio.com/roomInfo')

	$scope.players = $firebaseArray(presenceRef);

	$scope.players.$loaded().then(function() {
        userRef.set({points: 0, userid:$scope.userid});
    });

	//URLs
	var URL = "https://api.wordnik.com/v4/word.json/"; //Wordnik
	var URL2 = "https://words.bighugelabs.com/api/2/"; //BigHugeThesaurus
	var filter = "/definitions?limit=200&includeRelated=true&useCanonical=false&includeTags=false&api_key="; //Wordnik

	//Demo keys
	var api_key = "a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5"; //Wordnik
	var api_key2 = "de3464d869cd5c75f999b6e8ac430fb6"; //BigHugeThesaurus

	var failures = 0;
	var inactionCounter = 0;

	$scope.points = 0;
	$scope.seconds = 0;
	$scope.showSubmit = true;
	$scope.showCompare = false;

	var intervalPromise = null;
	var active = false;

	$scope.wordlist = [];
	var listIndex = 0;

	$http.get("wordlist.json")
	.success(function(response) {$scope.wordlist = response.data;});

	$scope.fetchData = function() {

		$scope.showSubmit = false;

		$scope.status = "Fetching definition..."

		//Wordnik
		 $http.get(URL + $scope.wordlist[listIndex].word + filter + api_key)
		 .success(function(response) {
		 	$scope.definition = response[0].text;
		 	$scope.status = "";
		 	failures = 0;
		 	timerStart();
		 });

		//BigHugeThesaurus
		$http.get(URL2 + api_key2 + "/" + $scope.wordlist[listIndex].word + "/json")
			.success(function(response) {
				$scope.words = [];

				if($scope.wordlist[listIndex].type == "noun"){

					for (var i = response.noun.syn.length - 1; i >= 0; i--) {
						$scope.words[i] = {word: response.noun.syn[i], show: false, strike: false};
					};
				}
				else if($scope.wordlist[listIndex].type == "verb"){

					for (var i = response.verb.syn.length - 1; i >= 0; i--) {
						$scope.words[i] = {word: response.verb.syn[i], show: false, strike: false};
					};
				}
				else if($scope.wordlist[listIndex].type == "adjective"){

					for (var i = response.adjective.syn.length - 1; i >= 0; i--) {
						$scope.words[i] = {word: response.adjective.syn[i], show: false, strike: false};
					};
				}
				else if($scope.wordlist[listIndex].type == "adverb"){

					for (var i = response.adverb.syn.length - 1; i >= 0; i--) {
						$scope.words[i] = {word: response.adverb.syn[i], show: false, strike: false};
					};
				}

				$scope.showCompare = true;

				$scope.myWord = $scope.wordlist[listIndex].word;
				$scope.status = '';
				failures = 0;
			});
		};

	$scope.compare = function() {

		inactionCounter = 0;

		for (var i = $scope.words.length - 1; i >= 0; i--) {

			if($scope.words[i].word == $scope.input) {

				if(!$scope.words[i].show){
					$scope.status = "Success!";
					$scope.words[i].show = true;
					$scope.words[i].strike = true;
					$scope.points += 5;
					playerRef.child (userid).set({points: $scope.points});
					return;
				}
				else if($scope.words[i].show && !$scope.words[i].strike){
					$scope.status = "Good job!";
					$scope.words[i].strike = true;
					$scope.points += 1;
					playerRef.child (userid).set({points: $scope.points});
					return;
				}
				else {
					$scope.status = "You entered that word already. Try again.";
					return;
				}
			}
		};

		$scope.status = "That word didn't work. Try again.";
	};



	//Timer functions and stuff

	var inactionTrigger = function() {

		inactionCounter = 0;

		for (var i = $scope.words.length - 1; i >= 0; i--) {
			
			if(!$scope.words[i].show) {

				$scope.words[i].show = true;
				return;
			}
		};
	}

	var outOfTime = function() {

		$scope.status = "Out of time. Revealing answers.";
		listIndex++;

		for (var i = $scope.words.length - 1; i >= 0; i--) {
			
			if(!$scope.words[i].show) {
				$scope.words[i].show = true;
			}
		}

		if(listIndex == $scope.wordlist.length) {

			$scope.myWord = "Game Over"
			$scope.definition = "No more words remain. Thanks for playing!"
			return;
		}

		$scope.showSubmit = true;
	}

	var timerStart = function() {

		$scope.seconds = 60;
		active = true;

		if (intervalPromise == null) {intervalPromise = $interval(timerTick, 1000);}
	}

	var timerStop = function() {

		$interval.cancel(intervalPromise);
		intervalPromise = null;
		active = false;
	}

	var timerTick = function() {

		if(active) {
			$scope.seconds--;
			inactionCounter++;

			if($scope.seconds === 0) {
	        	timerStop();
	        	outOfTime();
			}
			else if(inactionCounter == 10) {
				inactionTrigger();
			}
		}
	}
	intervalPromise = $interval(timerTick, 1000);






	//Connetivity and Multiplayer stuff
	amOnline.on('value', function(snapshot) {
   		if (snapshot.val()) {
     		userRef.onDisconnect().remove();
     		userRef.set(true);
  		}
	});
}]);

app.directive('appdir', function ($templateCache) {

	return {
		restrict: 'E',
		//template: $templateCache.get('synonym-mini-game.html')
		templateUrl: 'synonym-template.html'
	};
});

app.filter('playerFilter', ['$http', function($http) {
	return function(input, userid, scope) {

		var out = scope.animals[input].name;

		if(input == userid) {
			out += " (You)";
		}

		return out;
	}
}]);
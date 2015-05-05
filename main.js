var app = angular.module("synonymApp", ["firebase"]);

app.run(function ($templateCache){

	//templateCache is not being used at this time
	$templateCache.put('synonym-mini-game.html', '');
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

        //Sticking this here to make sure it waits for the page to load first.
        var intro = introJs();
		intro.start();
    });

	var inactionCounter = 0;

	$scope.points = 0;
	$scope.seconds = 0;
	$scope.showSubmit = true;
	$scope.showCompare = false;

	var intervalPromise = null;
	var active = false;

	$scope.wordlist = [];
	var listIndex = 0;
	var synTracker = [];

	$http.get("wordlist.json")
	.success(function(response) {$scope.wordlist = response.data;});

	$scope.fetchData = function() {

		$scope.showSubmit = false;

		$scope.words = [];

		for (var i = 0; i <= $scope.wordlist[listIndex].synonyms.length - 1; i++) {

			var blanks = "";
			for (var j = 0; j <= $scope.wordlist[listIndex].synonyms[i].syn.length - 1; j++) {
				blanks += "-"
			};
			
			synTracker[i] = i;
			$scope.words[i] = {word: $scope.wordlist[listIndex].synonyms[i].syn, dummy:blanks, toSwap:0, strike:false, points:""};
		}

		$scope.showCompare = true;
		$scope.myWord = $scope.wordlist[listIndex].word;
		$scope.definition = $scope.wordlist[listIndex].definition;
		$scope.status = "";
		timerStart();
	};

	$scope.compare = function() {

		inactionCounter = 0;
		$scope.input = $scope.input.toLowerCase();

		for (var i = $scope.words.length - 1; i >= 0; i--) {

			if($scope.words[i].word == $scope.input) {

				if(!$scope.words[i].strike){
					$scope.status = "Good job!";
					$scope.input = "";
					$scope.words[i].dummy = $scope.words[i].word;
					$scope.words[i].strike = true;
					$scope.points += $scope.words[i].word.length - $scope.words[i].toSwap;
					$scope.words[i].points = "+ " + ($scope.words[i].word.length - $scope.words[i].toSwap);

					userRef.update({points: $scope.points});

					trackerRemove(i);
					return;
				}
				else {
					$scope.status = "You entered that word already. Try again.";
					$scope.input = "";
					return;
				}
			}
		};

		$scope.status = "That word didn't work. Try again.";
		$scope.input = "";
	};

		//Helper functions

	//Custom string character replace function
	var replaceAt = function(str, index, chr) {

		return str.substr(0,index) + chr + str.substr(index+1);
	}

	//Remove a completed synonym from the tracker list
	var trackerRemove = function(index) {

		for (var i = synTracker.length - 1; i >= 0; i--) {
			if(synTracker[i] == index) {
				synTracker.splice(i, 1);
			}
		};
	}

	//Timer functions and stuff
	var inactionTrigger = function() {

		inactionCounter = 0;

		var wordIndex = Math.round(Math.random() * (synTracker.length - 1));
		var item = $scope.words[synTracker[wordIndex]];
		item.dummy = replaceAt(item.dummy, item.toSwap, item.word.charAt(item.toSwap));
		item.toSwap++;
		console.log(item.toSwap);

		if(item.toSwap == item.word.length - 1) {

			trackerRemove(synTracker[wordIndex]);
		}
	}

	var outOfTime = function() {

		$scope.status = "Out of time. Revealing answers.";
		listIndex++;
		inactionCounter = 0;

		for (var i = $scope.words.length - 1; i >= 0; i--) {
			
			$scope.words[i].dummy = $scope.words[i].word;
			$scope.words[i].toSwap = $scope.words[i].word.length - 1;
		}

		if(listIndex == $scope.wordlist.length) {

			$scope.myWord = "Game Over"
			$scope.definition = "No more words remain. Thanks for playing!"
			return;
		}

		$scope.showSubmit = true;
	}

	var timerStart = function() {

		$scope.seconds = 45;
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
			else if(inactionCounter == 1) {
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

		if (scope.animals[input]) { 
			var out = scope.animals[input].name;

			if(input == userid) {
				out += " (You)";
			}

			return out;
		}
	}
}]);
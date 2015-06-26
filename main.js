var app = angular.module("synonymApp", ["firebase", "ngSanitize", ]);

app.run(function ($templateCache){

	//templateCache is not being used at this time
	$templateCache.put('synonym-mini-game.html', '');
});

app.controller("AppCtrl", ['$scope', '$http','$sce', '$compile', '$interval', '$firebase','$sanitize' , '$firebaseObject', '$firebaseArray', function ($scope, $http, $sce, $compile, $interval, $firebase, $sanitize, $firebaseObject, $firebaseArray) {

	$scope.userid = Math.round(Math.random() * 586);
	$scope.animals = [];
	$scope.showLevelSelect = true;
	$scope.showGame = false;
	$scope.showNextLevelButton = false;
	$http.get("animals.json").success(function(response) { $scope.animals = response.data; });

	$scope.levelListHTML = "";//used to store the html used to make the level list
	var leveList;//used for storing the list of levels from the JSON file


	$scope.LevelGetPromise = $http.get('LevelList.json').success(function(response) {levelList = response.levels; $scope.levelListHTML = levelList.length});

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
	var totalTimePerWord = 45;

	$scope.points = 0;
	$scope.secondsCounter = 0;
	$scope.showSubmit = true;
	$scope.showCompare = false;

	var intervalPromise = null;
	var active = false;

	$scope.wordlist = [];
	$scope.wordnumber = 0;
	var listIndex = 0;
	var synTracker = [];

	$scope.currentLevelInfo = {};//used to store the all the info about the level retreived from the json file


	$scope.showSubmit = true;
	//gets the level list from JSON and stores it


	//getLevelData(), gets the level from the level number specified
	$scope.getLevelData = function(level){
			//checks all the members of the json file to see which level's LevlNumber matches the one specified in the parameter
			for(var i =0; i < levelList.length; i++){
				if(levelList[i].levelNumber == level){
					//sets the levelInfo to what is stored in the JSON file
					$scope.currentLevelInfo = levelList[i];

				}
			}
			console.log($scope.currentLevelInfo);
			//gets the json file and sets it to the word list
			$http.get($scope.currentLevelInfo.levelFile).success(function(response) {$scope.wordlist = response.data;});

	}
	//used to parse the json file and place all objects into the word[] array
	$scope.fetchData = function() {

		setInputState(false);

		$scope.showSubmit = false;

		$scope.words = [];

		for (var i = 0; i <= $scope.wordlist[listIndex].synonyms.length - 1; i++) {

			var blanks = "";
			for (var j = 0; j <= $scope.wordlist[listIndex].synonyms[i].syn.length - 1; j++) {

				if(j==0)
				{
					blanks += $scope.wordlist[listIndex].synonyms[i].syn.substring(0,1)
				}
				else
				{
					blanks += "-"
				}

			};

			synTracker[i] = i;
			$scope.words[i] = {word: $scope.wordlist[listIndex].synonyms[i].syn, dummy:blanks, toSwap:1, strike:false, points:""};
		}

		$scope.showCompare = true;
		$scope.myWord = $scope.wordlist[listIndex].word;
		$scope.definition = $scope.wordlist[listIndex].definition;
		$scope.status = "";
		$scope.wordnumber = listIndex + 1;
		timerStart();
	};
	//used to compare word to user input
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
	//switches states between the level select screen and the game itself
	$scope.switchState = function(){
		if($scope.showLevelSelect == true){
			$scope.resetLevel();
			$scope.showGame = true;
			$scope.showLevelSelect = false;
			listIndex = 0;
			synTracker = [];
		}
		else{
			$scope.resetLevel()
			$scope.showGame = false;
			$scope.showLevelSelect = true;		}


	}
	//this resets the level by reseting most of the game values
	$scope.resetLevel = function(){
		timerStop();
		$scope.showSubmit = true;
		$scope.showNextLevelButton = false;
		$scope.wordnumber = 0;
		$scope.secondsCounter = totalTimePerWord;
		$scope.wordlist = [];
		$scope.words = [];
		$scope.status = '';
		$scope.myWord = '';
		$scope.definition = '';
		listIndex = 0;
		synTracker = [];
	}
	//this changes the level once the player has beaten the level
	//this is called template with the Next Level Button
	$scope.changeLevel = function(){

		$scope.resetLevel();
		$scope.getLevelData($scope.currentLevelInfo.levelNumber + 1);
		$scope.status = "Next Level";


	}


		//Helper functions
	//checks to see if there is a next level
	//returns true when there is a next level, returns false when there is not
	var checkIfNextLevel = function(levelL){
		//gets the last level in the array of levels, and checks if that
		//level is not equal to the current level.  If they are not equal,
		//there is a next level
		var levelAmount = levelL.length - 1;
		if(levelL[levelAmount].levelNumber != $scope.currentLevelInfo.levelNumber)
		{
			return true;
		}
		else
		{
			return false
		}
	}

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
		//console.log(item.toSwap);

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

			if(checkIfNextLevel(levelList) == true)
			{
				console.log("there is a next level");
				$scope.showNextLevelButton = true;

			}
			else {

			}

			return;
		}

		$scope.showSubmit = true;
	}

	var timerStart = function() {

		$scope.secondsCounter = totalTimePerWord;
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
			$scope.secondsCounter--;
			inactionCounter++;

			if($scope.secondsCounter === 0) {
	        	timerStop();
	        	outOfTime();
						setInputState(true);
			}
			else if(inactionCounter == 1) {
				inactionTrigger();
			}
		}
	}
	//sets the input to disabled (greys it out)
	var setInputState = function(state){

			$("#main-input").prop('disabled', state)


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

//this is used to create all of the buttons for all of the levels in the level select
app.directive("level", function($compile, $http){
	return function($scope, element, attrs){
			var NumofLevels;
			$scope.LevelGetPromise.success(function(response){
			NumofLevels = response.levels.length;
			for(var i = 0; i < NumofLevels; i++){
				//easy levels
				if(i == 0){
					element.append($compile("<table><tr><th>Easy</th></tr>")($scope));
					element.append($compile("<tr><td><button ng-click='switchState(); getLevelData("+ (i+1)+")'>LEVEL "+(i+1)+"</button></td></tr>")($scope));
				}
				if(i > 0 && i < 3){
					element.append($compile("<tr><td><button ng-click='switchState(); getLevelData("+ (i+1)+")'>LEVEL "+(i+1)+"</button></td></tr>")($scope));
				}
				if(i == 3){
					element.append($compile("<tr><td><button ng-click='switchState(); getLevelData("+ (i+1)+")'>LEVEL "+(i+1)+"</button></td></tr>")($scope));
					element.append($compile("</table>")($scope));
				}
				//medium levels
				if(i == 4){
					element.append($compile("<table><tr><th>Medium</th></tr>")($scope));
					element.append($compile("<tr><td><button ng-click='switchState(); getLevelData("+ (i+1)+")'>LEVEL "+(i+1)+"</button></td></tr>")($scope));
				}
				if(i > 4 && i < 6){
					element.append($compile("<tr><td><button ng-click='switchState(); getLevelData("+ (i+1)+")'>LEVEL "+(i+1)+"</button></td></tr>")($scope));
				}
				if(i == 6){
					element.append($compile("<tr><td><button ng-click='switchState(); getLevelData("+ (i+1)+")'>LEVEL "+(i+1)+"</button></td></tr>")($scope));
					element.append($compile("</table>")($scope));
				}
				//hard levels
				if(i == 7){
					element.append($compile("<table><tr><th>Hard</th></tr>")($scope));
					element.append($compile("<tr><td><button ng-click='switchState(); getLevelData("+ (i+1)+")'>LEVEL "+(i+1)+"</button></td></tr>")($scope));
				}
				if(i > 7 && i < 10){
					element.append($compile("<tr><td><button ng-click='switchState(); getLevelData("+ (i+1)+")'>LEVEL "+(i+1)+"</button></td></tr>")($scope));
				}
				if(i == 10){
					element.append($compile("</table>")($scope));
				}
			}
		});

	};

});

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

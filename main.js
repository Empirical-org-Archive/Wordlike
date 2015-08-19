var app = angular.module("synonymApp", ["firebase", "ngSanitize", ]);

app.run(function ($templateCache){

	//templateCache is not being used at this time
	$templateCache.put('synonym-mini-game.html', '');
});

app.controller("AppCtrl", ['$scope', '$http','$timeout' ,'$sce', '$window', '$location', '$compile', '$interval', '$firebase','$sanitize' , '$firebaseObject', '$firebaseArray',
function ($scope, $http, $timeout ,$sce, $window, $location, $compile, $interval, $firebase, $sanitize, $firebaseObject, $firebaseArray) {


	$scope.userid = Math.round(Math.random() * 586);
	$scope.animals = [];
	$scope.showLevelSelect = true;
	$scope.showGame = false;
	$scope.showScore = false;
	$scope.showGoal = false;
	$scope.showEndofRoundStatus = false;
	$scope.showCompletedGoal = false;
	$http.get("animals.json").success(function(response) { $scope.animals = response.data; });

	$scope.levelListHTML = "";//used to store the html used to make the level list
	var leveList = [];//used for storing the list of levels from the JSON file


	$scope.LevelGetPromise = $http.get('LevelList.json').success(function(response) {levelList = response.levels; $scope.levelListHTML = levelList.length});
	var endOfRoundCountdownPromise;
	var startOfRoundCountdownPromise;

	var amOnline = new Firebase('https://synonymtest1.firebaseio.com/.info/connected');
	var presenceRef = new Firebase('https://synonymtest1.firebaseio.com/presence/');
	var userRef = presenceRef.push();

	var roomRef = new Firebase('https://synonymtest1.firebaseio.com/roomInfo');

	$scope.players = $firebaseArray(presenceRef);
	$scope.sortedPlayerList = [];

	$scope.players.$loaded().then(function() {
        userRef.set({points: 0, userid:$scope.userid});

        //Sticking this here to make sure it waits for the page to load first.
        var intro = introJs();
		intro.start();
    });

	var inactionCounter = 0;

	var totalTimePerWord = 60;//amount of time per round
	$scope.goalNumberWords = 5;//the number of words to meet the goal
	$scope.points = 0;//the number of points the player has
	$scope.secondsCounter = 0;//how many seconds the game has counting for the round, essentially a timer

	$scope.lastPointIncrease = 0;//last point increase the player recieved

	var intervalPromise = null;//the interval has not been set
	$scope.active = false; //game is set to active

	$scope.currentLevelWordList  = []; //the list of word objects for the level
	$scope.wordnumber = 0;//the word number in the level
	var listIndex = 0; //the word number in the level
	var synTracker = []; //the tracker of the synonyms for the current round
	$scope.currentRoundCorrectWords = [];//list of words the user got correct this round
	$scope.currentLevelCorrectWords = [];//list of words the user got correct this level


	$scope.currentLevelInfo = {};//used to store the all the info about the level retreived from the json file




	//gets the level list from JSON and stores it


	//getLevelData(), gets the level from the level number specified
	//retrieves the level data from the JSON level list
	$scope.getLevelData = function(level){
		//hides the box used to show the score
		$("#purple-box").hide();

			//checks all the members of the json file to see which level's LevlNumber matches the one specified in the parameter
			for(var i =0; i < levelList.length; i++){
				if(levelList[i].levelNumber == level){
					//sets the levelInfo to what is stored in the JSON file
					$scope.currentLevelInfo = levelList[i];

				}
			}
			//gets the json file and sets it to the word list
			$http.get($scope.currentLevelInfo.levelFile).success(function(response) {$scope.currentLevelWordList  = response.data; });


	}
	//used to parse the json file and place all objects into the word[] array
	$scope.fetchData = function() {
		//resets the list of words the user got at the end of the round
		$scope.currentRoundCorrectWords = [];
		//allows the user to input to the text box
		$scope.setInputState(true);
		//array of word objects
		$scope.currentWordSynonyms = [];
		//this gives the words the right length
		for (var i = 0; i <= $scope.currentLevelWordList [listIndex].synonyms.length - 1; i++) {

			var blanks = "";
			for (var j = 0; j <= $scope.currentLevelWordList [listIndex].synonyms[i].syn.length - 1; j++) {

				if(j==0)
				{
					blanks += $scope.currentLevelWordList [listIndex].synonyms[i].syn.substring(0,1)
				}
				else
				{
					blanks += "."
				}

			};

			synTracker[i] = i;
			//currentWordSynonyms is an array of objects that are the synonyms of the current word
			//word: this is the synonym of the current word
			//dummy: this is the amount of '.' there are that was given to this word above
			//toSwap: the current index in the word at which to swap the letters of
			//strike: whether or not the word has been guessed correctly already
			//points: the amount of points awarded for getting this word correct
			$scope.currentWordSynonyms[i] = {word: $scope.currentLevelWordList [listIndex].synonyms[i].syn, dummy:blanks, toSwap:1, strike:false, points:""};
		}

		//this makes the level playable

		$scope.currentWord = $scope.currentLevelWordList [listIndex].word;//gets the next word
		$scope.definition = $scope.currentLevelWordList [listIndex].definition;//gets the words definition
		$scope.wordnumber = listIndex + 1;//gets the number of the word being used in the level
		$scope.lastPointIncrease = 0;//sets the initial value for the last score the player got
		startOfRoundCountdownPromise = $interval(countDowntoGameStart, 1000);//starts the countdown to the gamestart


	};

	//used to compare word to user input
	//is called everytime the user makes a change to the input box in game
	//the parameter is used to see if the user has pressed enter
	$scope.compare = function(pressedEnter) {
		inactionCounter = 0;
		//this sets the input all to lowercase
		$scope.input = $scope.input.toLowerCase();
		//this next for loop is used to check if the player has inputed any spaces
		//if they have, then change the spaces to a dash
		var inputTemp = "";
		for(var i=0; i < $scope.input.length; i++){
			if($scope.input.charAt(i) == " ")
			{
				inputTemp += "-"
			}else{
				inputTemp += $scope.input.charAt(i);
			}
		}
		$scope.input = inputTemp;//sets the new inputTemp to the scopes input

		//this is used to compare the input to each word in the displayed wordlist
		for (var i =  $scope.currentWordSynonyms.length - 1; i >= 0; i--) {
			//if the words are equal
			if( $scope.currentWordSynonyms[i].word == $scope.input) {
				//if the word has not already been entered...
				if(! $scope.currentWordSynonyms[i].strike){
					$("#purple-box").hide();//hides the purple box for the score
					$scope.input = "";//resets the input box
					$scope.currentWordSynonyms[i].dummy =  $scope.currentWordSynonyms[i].word; // sets the dummy the full word
					$scope.currentWordSynonyms[i].strike = true; //the word is complete, puts a strike through it
					$scope.points +=  $scope.currentWordSynonyms[i].word.length -  $scope.currentWordSynonyms[i].toSwap; // adds the points from this word to the players points
					$scope.currentWordSynonyms[i].points = "+ " + ( $scope.currentWordSynonyms[i].word.length -  $scope.currentWordSynonyms[i].toSwap);
					$scope.lastPointIncrease = $scope.currentWordSynonyms[i].points;//sets tehg last point increase to the score just recieved
					$scope.currentRoundCorrectWords.push($scope.currentWordSynonyms[i]);//adds the current word to the words correct from this round
					$scope.currentLevelCorrectWords.push($scope.currentWordSynonyms[i]);//adds the current word to the words correct from this level

					userRef.update({points: $scope.points});//updates the users amount of points

					fadeOutBox(2000);//fades out the box from the

					trackerRemove(i);//removes the word from the tracker
					return;
				}
				else {
					return;
				}
			}
			//clears the input if enter is pressed
			if(pressedEnter == true){
					$scope.input = "";

			}


		};
		//handles fading in and out of the score
		//$("#purple-box").fadeOut("slow");

	};
	//switches states between the level select screen and the game itself and the score screen
	$scope.switchState = function(state){
		//show level select
		if(state == 1)
		{
			//used to cancel the promises if changing a level
			$interval.cancel(startOfRoundCountdownPromise);
			$interval.cancel(endOfRoundCountdownPromise);
			$interval.cancel(intervalPromise);
			$scope.showGame = false;
			$scope.showScore = false;
			$scope.showLevelSelect = true;
			$scope.showGoal = false;

		}
		//show game
		if(state == 2)
		{
				$scope.showGame = true;
				$scope.showScore = false;
				$scope.showLevelSelect = false;
				$scope.showGoal = false;

		}
		//show score screen
		if(state == 3)
		{
			$scope.showGame = false;
			$scope.showScore = true;
			$scope.showLevelSelect = false;
			$scope.showGoal = false;
		}
		//shows the goal screen
		if(state == 4)
		{
			$scope.showGame = false;
			$scope.showScore = false;
			$scope.showLevelSelect = false;
			$scope.showGoal = true;
		}


	}

	//this resets the level by reseting most of the game values
	$scope.resetLevel = function(){
		timerStop();

		$scope.showEndofRoundStatus = false;
		$scope.wordnumber = 0;
		$scope.secondsCounter = totalTimePerWord;
		$scope.currentLevelWordList  = [];
		$scope.currentWordSynonyms = [];
		$scope.status = '';
		$scope.currentWord = '';
		$scope.definition = '';
		$scope.lastPointIncrease = 0;
		listIndex = 0;
		synTracker = [];
	}
	//this changes the level once the player has beaten the level
	//this is called template with the Next Level Button
	$scope.changeLevel = function(){
		$scope.resetLevel();
		$scope.getLevelData($scope.currentLevelInfo.levelNumber + 1);
		console.log($scope.currentLevelInfo);
		$scope.switchState(4);

	}
	//this formats the time so that it appears as "1:00"
	$scope.formatTime = function(){
		var time = "";
		var minutes = Math.floor($scope.secondsCounter / 60)
		var seconds = $scope.secondsCounter % 60;
		if (seconds < 10){
			seconds = "0"+ seconds;
		}

		time = minutes + ":" + seconds;
		return time;

	}
	//this is used to fade out the purple box that shows the last score the player got
	var fadeOutBox = function(time){
		$("#purple-box").stop(true, true);
		$("#purple-box").show();
		setTimeout(function(){
			$("#purple-box").fadeOut("fast");
		}, time);
	}
	//this is used to countsdown to when the player has
	var countDowntoGameStart = function(){
		$scope.lastPointIncrease --;
		$("#purple-box").show();

		if($scope.lastPointIncrease == 0){
			$scope.setInputState(false);
			$scope.lastPointIncrease = "Go!";
			$interval.cancel(startOfRoundCountdownPromise);
			fadeOutBox(500);
			startOfRoundCountdownPromise = null;
			$("#main-input").focus();

			timerStart();
		}
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



	//gets the player list and sorts them by the amount of points they have
	//also sorts out players that appear as null or undefined
	var sortPlayers = function(){

		$scope.sortedPlayerList = [];
		var scores = [];
		var playerTemp = $scope.players;
		for(var i = 0; i < $scope.players.length; i++){

			if($scope.players[i].points != undefined || $scope.players[i].points != undefined){

				scores.push($scope.players[i].points);
			}
			else
			{
				$scope.players.splice(i,1);
			}

		}
		var HighestScore = Math.max.apply(null, scores);
		for(var i = HighestScore; i >= 0; i--){
			for(var j = 0; j < playerTemp.length; j++){
				if($scope.players[j].points == i)
				{
					playerTemp[j].placeNumber = j+1;
					$scope.sortedPlayerList.push(playerTemp[j]);

				}
			}

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
	//checks to see if there are any words left for the player to fill in
	var checkWordsLeft = function(){
		var wordcount = 0;
		for(var i=0; i < $scope.currentWordSynonyms.length; i++)
		{
			if($scope.currentWordSynonyms[i].strike == true)
			{
				wordcount++;
			}
		}
		if(wordcount == $scope.currentWordSynonyms.length)
		{
			return true;
		}
		else {
			return false;
		}
	}
	//this contains the logic for when the user runs out of time in the level
	//it sorts the players list, and shows whether that player met their goal of correct words.
	var endRound = function(){
		sortPlayers();
		if($scope.currentRoundCorrectWords.length >= $scope.goalNumberWords){
			$scope.showCompletedGoal = true;

		}
		else{

			$scope.showCompletedGoal = false;
		}
		$scope.setInputState(true);
		$scope.switchState(3);
	}

	//this is fired every second on the game
	//it gets a random word from the list of synonyms and swaps a letter out for it.
	var inactionTrigger = function() {

		inactionCounter = 0;

		var wordIndex = Math.round(Math.random() * (synTracker.length -1));//gets a random word index
		var item = $scope.currentWordSynonyms[synTracker[wordIndex]];//gets the word from the above index
		item.dummy = replaceAt(item.dummy, item.toSwap, item.word.charAt(item.toSwap));//replaces the dummy with the new dummy
		item.toSwap++;//increses that synonym objects toSwap value
		//removes the word from the tracker if it is fully revealed
		if(item.toSwap == item.word.length - 1) {

			trackerRemove(synTracker[wordIndex]);
		}
	}
	//when the player runs out of time
	var outOfTime = function() {
		//increases to the next word
		listIndex++;
		inactionCounter = 0;
		//reveals all the words
		for (var i = $scope.currentWordSynonyms.length - 1; i >= 0; i--) {

			$scope.currentWordSynonyms[i].dummy = $scope.currentWordSynonyms[i].word;
			$scope.currentWordSynonyms[i].toSwap = $scope.currentWordSynonyms[i].word.length - 1;
		}
		//checks to see if there is a next level
		if(listIndex == $scope.currentLevelWordList .length) {

			if(checkIfNextLevel(levelList) == true)
			{
				console.log("there is a next level");
				$scope.showEndofRoundStatus = true;

			}
			else {

			}

			return;
		}
	}
	//starts the time and creates the intervalPromise object
	var timerStart = function() {
		$scope.secondsCounter = totalTimePerWord;
		$scope.active = true;

		if (intervalPromise == null) {intervalPromise = $interval(timerTick, 1000); }
	}
	//stops the timer
	var timerStop = function() {

		if($interval.cancel(intervalPromise)){
			sortPlayers();
			endOfRoundCountdownPromise = $timeout(endRound, 4000);
		}
		intervalPromise = null;
		$scope.active = false;
	}
	//this is called everytime the the timer tickds (every one second)
	var timerTick = function() {
	$("#main-input").focus();//focus on the textbox
		//if the game is active
		if($scope.active) {
			//reduce time by one
			$scope.secondsCounter--;
			//add to the inaction counter
			inactionCounter++;

			//checks if all the words have been entered
			if(checkWordsLeft() == true)
			{
				$scope.secondsCounter = 0;
			}
			//if the player has run out of time
			if($scope.secondsCounter == 0)
			{
	        	timerStop();
	        	outOfTime();
			}
			else if(inactionCounter == 1) {
				inactionTrigger();
			}
		}
	}
	//sets the input to disabled (greys it out)
	$scope.setInputState = function(state){

			$("#main-input").prop('disabled', state)


	}

	//sets the promise to the timer tick when the game starts
	intervalPromise = $interval(timerTick, 1000);


	//connects to Firebase and checks whether the user is online
	amOnline.on('value', function(snapshot) {
   		if (snapshot.val()) {
     		userRef.onDisconnect().remove();
     		userRef.set(true);
  		}
	});
}]);
//below are the directives thatare used in the index.html

//this directive is used to put the game state in the tag labeled appdir, it uses the synonym-template.html page as its template
app.directive('appdir', function ($templateCache) {

	return {
		restrict: 'E',
		//template: $templateCache.get('synonym-mini-game.html')
		templateUrl: 'synonym-template.html'
	};
});

//this directive is used to put the header in the tag labeled head, it uses the header-template.html page as its template
app.directive('headtemp', function ($templateCache) {

	return {
		restrict: 'E',
		templateUrl: 'header-template.html'
	};
});

//this directive is used to put the goal page in the tag labeled goaltem, it uses the goal-template.html page as its template
app.directive('goaltemp', function ($templateCache) {

	return {
		restrict: 'E',
		templateUrl: 'goal-template.html'
	};
});

//this directive is used to put the level list in the tag labeled levellist, it uses the levellist-template.html page as its template
app.directive('levellist', function ($templateCache) {

	return {
		restrict: 'E',
		templateUrl: 'levellist-template.html'
	};
});

//this directive is used to put the score template in the tag labeled scoretemp, it uses the score-template.html page as its template
app.directive('scoretemp', function ($templateCache) {

	return {
		restrict: 'E',
		templateUrl: 'score-template.html'
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

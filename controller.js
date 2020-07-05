var imgLoader = null;
const K = 20;
const dbName = "facemash_db"
const guytable = "guy_table"
const galtable = "gal_table"

const guyimgdir = "img/guys"
const galimgdir = "img/gals"

const guyStartIndex = 0;
const guyEndIndex = 3;
const galStartIndex = 0;
const galEndIndex = 3;

var db;

var leftImage;
var rightImage;

function onLikeGuysClicked() {
	sessionStorage.setItem("prefGuys", true);
	window.location.replace('facemash.html');
}

function onLikeGalsClicked() {
	sessionStorage.setItem("prefGuys", false);
	window.location.replace('facemash.html');
}

function onFacemashLoad() {
	// check if prev DB exists; if not, create a new one and init all
	// ELO to 1200.

	var request = indexedDB.open(dbName);
	request.onupgradeneeded = function(e) { initDB(e) };
	request.onerror = function(e) {console.log("Cannot use local DB");}
	request.onsuccess = function(e) {db = e.target.result;}

	if (sessionStorage.getItem("prefGuys") === "true") {
		imgLoader = new ImageLoader(guyimgdir, guyStartIndex, guyEndIndex, "jpg");
	}
	else {
		imgLoader = new ImageLoader(galimgdir, galStartIndex, galEndIndex, "jpg");
	}
	onNextClicked();
}

function initDB(event) {
	db = event.target.result;

	if (!db.objectStoreNames.contains(guytable)) {
		var guyObjStore = db.createObjectStore(guytable);
		for (var i=guyStartIndex; i<=guyEndIndex; i++) {
			guyObjStore.add(1200, i);
		}
	}
	if (!db.objectStoreNames.contains(galtable)) {
		var galObjStore = db.createObjectStore(galtable);
		for (var i=galStartIndex; i<=galEndIndex; i++) {
			galObjStore.add(1200, i);
		}
	}	
	console.log("Inited DB");
}

function updateElo(table, winnerId, loserId) {
	var objStore = db.transaction([table], "readwrite").objectStore(table);

	// JS is a humongous piece of shit for this annoying async db 
	// callback thing....
	var winnerInitialEloRequest = objStore.get(winnerId);
	winnerInitialEloRequest.onsuccess = function(e) {
		var loserInitialEloRequest = objStore.get(loserId);
		loserInitialEloRequest.onsuccess = function(f) {
			var winnerInitialElo = winnerInitialEloRequest.result;
			var loserInitialElo = loserInitialEloRequest.result;

			var winnerR = Math.pow(10, winnerInitialElo/400);
			var loserR = Math.pow(10, loserInitialElo/400);

			var winnerFactor = 1 - (winnerR/(winnerR + loserR));
			var loserFactor = 0 - (loserR/(winnerR + loserR));

			var winnerFinalElo = winnerInitialElo + K*(winnerFactor);
			var loserFinalElo = loserInitialElo + K*(loserFactor);

			console.log(winnerId + ": " + winnerInitialElo + " -> " + winnerFinalElo); 
			console.log(loserId + ": " + loserInitialElo + " -> " + loserFinalElo); 

			objStore.put(winnerFinalElo, winnerId);
			objStore.put(loserFinalElo, loserId);
		}
	}
}

function onLeftImageClicked() {
	console.log("Left img clicked");
	if (sessionStorage.getItem("prefGuys") === "true") {
		// Again, JS is a humongous piece of shit for implicit
		// type declaration, you don't know what type you're 
		// passing to the function....
		updateElo(guytable, parseInt(leftImage.id), parseInt(rightImage.id));
	}
	else {
		updateElo(galtable, parseInt(leftImage.id), parseInt(rightImage.id));
	}
	onNextClicked();
}

function onRightImageClicked() {
	console.log("Right img clicked");
	if (sessionStorage.getItem("prefGuys") === "true") {
		updateElo(guytable, parseInt(rightImage.id), parseInt(leftImage.id));
	}
	else {
		updateElo(galtable, parseInt(rightImage.id), parseInt(leftImage.id));
	}
	onNextClicked();
}

function onStopClicked() {
	console.log("Stop clicked");
	window.location.replace('facemash_intro_page.html');	
}

function onLeaderboardClicked() {
	console.log("Leaderboard clicked");
	window.location.replace('facemash_leaderboard.html');
}

function onLeaderboardLoaded() {

	var request = indexedDB.open(dbName);
	request.onsuccess = function(e) {db = e.target.result;
	var table = document.getElementById("leaderboard");

	console.log("Got leaderboard");
	if (sessionStorage.getItem("prefGuys") === "true") {
		var objStore = db.transaction([guytable], "readwrite").objectStore(guytable);
		objStore.openCursor().onsuccess = function(e) {
		console.log("Txn success");
			var cursor = e.target.result;
			if (cursor) {
				let row = table.insertRow();
				let id = row.insertCell(0);
				id.innerHTML = cursor.key;
				let img = row.insertCell(1);
				img.innerHTML = 
				"<img class=\"thumbnail\" src=\""+guyimgdir+"/"+cursor.key+".jpg\">";
				let elo = row.insertCell(2);
				elo.innerHTML = Math.floor(cursor.value);
				cursor.continue();
			}
		}
	}
	else {
		var objStore = db.transaction([galtable], "readwrite").objectStore(galtable);
		objStore.openCursor().onsuccess = function(e) {
		console.log("Txn success");
			var cursor = e.target.result;
			if (cursor) {
				let row = table.insertRow();
				let id = row.insertCell(0);
				id.innerHTML = cursor.key;
				let img = row.insertCell(1);
				img.innerHTML = 
				"<img class=\"thumbnail\" src=\""+galimgdir+"/"+cursor.key+".jpg\">";
				let elo = row.insertCell(2);
				elo.innerHTML = Math.floor(cursor.value);
				cursor.continue();
			}
		}
	}	
}
}

function onNextClicked() {
	console.log("Next image clicked");
	leftImage = imgLoader.loadRandomImage();
	rightImage = imgLoader.loadRandomImage();
	while (leftImage.id == rightImage.id) {
		rightImage = imgLoader.loadRandomImage();
	}
	document.getElementById("leftImage").src = leftImage.src;
	document.getElementById("rightImage").src = rightImage.src;
}

class ImageLoader {
	constructor(dir, is, ie, itype) {
		this.startindex = is;
		this.endindex = ie;
		this.directory = dir;
		this.imgType = itype
	}

	loadRandomImage() {
		var imgId = Math.floor(Math.random() * (this.endindex - this.startindex + 1)) + this.startindex;
		var img = new Image();
		img.src = this.directory+"/"+imgId+"."+this.imgType;
		img.id = imgId;
		return img;
	}
}


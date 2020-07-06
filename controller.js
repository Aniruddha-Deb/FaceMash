var apiLoc = "/api/gals/";

var leftImageId;
var rightImageId;

function onLikeGuysClicked() {
	sessionStorage.setItem("prefGuys", true);
	window.location.replace('facemash.html');
}

function onLikeGalsClicked() {
	sessionStorage.setItem("prefGuys", false);
	window.location.replace('facemash.html');
}

function onFacemashLoad() {
	if (sessionStorage.getItem("prefGuys") === "true") {
		apiLoc = "/api/guys/";
	}
	onNextClicked();
}

function onImageClicked(side) {
	var apiUrl = apiLoc + "click?leftid=" + encodeURIComponent(leftImageId) + "&rightid=" +
	encodeURIComponent(rightImageId) + "&side=" + encodeURIComponent(side);

	fetch(apiUrl).then(
    	function(response) {
			onNextClicked();
    	}
  	);
}

function onLeftImageClicked() {
	onImageClicked("left");
}

function onRightImageClicked() {
	onImageClicked("right");
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
	// TODO this......
}

function onNextClicked() {
	console.log("Next image clicked");

	var apiUrl = apiLoc+"getrandomimg";

	fetch(apiUrl).then(
    	function(response) {
    		response.text().then( (r) => {
    			console.log(r);
				document.getElementById("leftImage").src = apiLoc+r;
				leftImageId = r.split(".")[0];
    		});
    	}
  	)

	fetch(apiUrl).then(
    	function(response) {
    		response.text().then( (r) => {
    			console.log(r);
				document.getElementById("rightImage").src = apiLoc+r;
				rightImageId = r.split(".")[0];
    		});
    	}
  	)
}
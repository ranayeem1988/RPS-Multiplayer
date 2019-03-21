var config = {
    apiKey: "AIzaSyATPRh0rEdy7-ghGHXvHa1UD7Ba5k9bFj0",
    authDomain: "rps-multiplayer-1654e.firebaseapp.com",
    databaseURL: "https://rps-multiplayer-1654e.firebaseio.com",
    projectId: "rps-multiplayer-1654e",
    storageBucket: "",
    messagingSenderId: "917020843048"
  };

firebase.initializeApp(config);

var db = firebase.database();
var playersRef = db.ref("/players");
var chatRef = db.ref("/chat");
var connectedRef = db.ref(".info/connected");

var playerName,
    player1LoggedIn = false,
    player2LoggedIn = false,
    playerNumber,
    playerObject,
    player1Object = {
        name: "",
        choice: "",
        wins: 0,
        losses: 0
    },
    player2Object = {
        name: "",
        choice: "",
        wins: 0,
        losses: 0
    },
    resetId;

connectedRef.on("value", function (snap) {
    if (!snap.val() && playerNumber) {
        db.ref("/players/" + playerNumber).remove();
        playerNumber = null;

        showLoginScreen();
    }
}, errorHandler);

chatRef.on("child_added", function (chatSnap) {
    let chatObj = chatSnap.val();
    let chatText = chatObj.text;
    let chatLogItem = $("<li>").attr("id", chatSnap.key);

    if (chatObj.userId == "system") {
        chatLogItem.addClass("system");
    } else if (chatObj.userId == playerNumber) {
        chatLogItem.addClass("current-user");
    } else {
        chatLogItem.addClass("other-user");
    }

    if (chatObj.name) {
        chatText = "<strong>" + chatObj.name + ":</strong> " + chatText;
    }

    chatLogItem.html(chatText);

    $("#chat-log").append(chatLogItem);
    $("#chat-log").scrollTop($("#chat-log")[0].scrollHeight);
}, errorHandler);

chatRef.on("child_removed", function (chatSnap) {
    $("#" + chatSnap.key).remove();
}, errorHandler);

playersRef.on("child_added", function (childSnap) {
    window["player" + childSnap.key + "LoggedIn"] = true;
    window["player" + childSnap.key + "Object"] = childSnap.val();
}, errorHandler);

playersRef.on("child_changed", function (childSnap) {
    window["player" + childSnap.key + "Object"] = childSnap.val();

    updateStats();
}, errorHandler);

playersRef.on("child_removed", function (childSnap) {
    chatRef.push({
        userId: "system",
        text: childSnap.val().name + " has disconnected"
    });

    window["player" + childSnap.key + "LoggedIn"] = false;
    window["player" + childSnap.key + "Object"] = {
        name: "",
        choice: "",
        wins: 0,
        losses: 0
    };

    if (!player1LoggedIn && !player2LoggedIn) {
        chatRef.remove();
    }
}, errorHandler);

playersRef.on("value", function (snap) {
    $("#player-1").text(player1Object.name || "Waiting for Player 1");
    $("#player-2").text(player2Object.name || "Waiting for Player 2");

    updatePlayerBox("1", snap.child("1").exists(), snap.child("1").exists() && snap.child("1").val().choice);
    updatePlayerBox("2", snap.child("2").exists(), snap.child("2").exists() && snap.child("2").val().choice);

    if (player1LoggedIn && player2LoggedIn && !playerNumber) {
        loginPending();
    } else if (playerNumber) {
        showLoggedInScreen();
    } else {
        showLoginScreen();
    }

    if (player1Object.choice && player2Object.choice) {
        rps(player1Object.choice, player2Object.choice);
    }

}, errorHandler);

$("#login").click(function (e) {
    e.preventDefault();

    if (!player1LoggedIn) {
        playerNumber = "1";
        playerObject = player1Object;
    }
    else if (!player2LoggedIn) {
        playerNumber = "2";
        playerObject = player2Object;
    }
    else {
        playerNumber = null;
        playerObject = null;
    }

    if (playerNumber) {
        playerName = $("#player-name").val().trim();
        playerObject.name = playerName;
        $("#player-name").val("");

        $("#player-name-display").text(playerName);
        $("#player-number").text(playerNumber);

        db.ref("/players/" + playerNumber).set(playerObject);
        db.ref("/players/" + playerNumber).onDisconnect().remove();
    }
});

$(".selection").click(function () {
    if (!playerNumber) return;

    playerObject.choice = this.id;
    db.ref("/players/" + playerNumber).set(playerObject);

    $(".p" + playerNumber + "-selections").hide();
    $(".p" + playerNumber + "-selection-reveal").text(this.id).show();
});

$("#send-chat").click(function (e) {
    e.preventDefault();

    chatRef.push({
        userId: playerNumber,
        name: playerName,
        text: $("#chat").val().trim()
    });

    $("#chat").val("");
});

function rps(p1choice, p2choice) {
    $(".p1-selection-reveal").text(p1choice);
    $(".p2-selection-reveal").text(p2choice);

    showSelections();

    if (p1choice == p2choice) {
        $("#feedback").text("TIE");
    }
    else if ((p1choice == "Rock" && p2choice == "Scissors") || (p1choice == "Paper" && p2choice == "Rock") || (p1choice == "Scissors" && p2choice == "Paper")) {
        $("#feedback").html("<small>" + p1choice + " beats " + p2choice + "</small><br/><br/>" + player1Object.name + " wins!");

        if (playerNumber == "1") {
            playerObject.wins++;
        } else {
            playerObject.losses++;
        }
    } else {
        $("#feedback").html("<small>" + p2choice + " beats " + p1choice + "</small><br/><br/>" + player2Object.name + " wins!");

        if (playerNumber == "2") {
            playerObject.wins++;
        } else {
            playerObject.losses++;
        }
    }

    resetId = setTimeout(reset, 3000);
}

function reset() {
    clearTimeout(resetId);

    playerObject.choice = "";

    db.ref("/players/" + playerNumber).set(playerObject);

    $(".selection-reveal").hide();
    $("#feedback").empty();
}

function updateStats() {
    ["1", "2"].forEach(playerNum => {
        var obj = window["player" + playerNum + "Object"];
        $("#p" + playerNum + "-wins").text(obj.wins);
        $("#p" + playerNum + "-losses").text(obj.losses);
    });

    player1LoggedIn ? $(".p1-stats").show() : $(".p1-stats").hide();
    player2LoggedIn ? $(".p2-stats").show() : $(".p2-stats").hide();
}

function updatePlayerBox(playerNum, exists, choice) {
    if (exists) {
        if (playerNumber != playerNum) {
            if (choice) {
                $(".p" + playerNum + "-selection-made").show();
                $(".p" + playerNum + "-pending-selection").hide();
            } else {
                $(".p" + playerNum + "-selection-made").hide();
                $(".p" + playerNum + "-pending-selection").show();
            }
        }
    } else {
        $(".p" + playerNum + "-selection-made").hide();
        $(".p" + playerNum + "-pending-selection").hide();
    }
}

function errorHandler(error) {
    console.log("Error:", error.code);
}

function loginPending() {
    $(".pre-connection, .pre-login, .post-login, .selections").hide();
    $(".pending-login").show();
}

function showLoginScreen() {
    $(".pre-connection, .pending-login, .post-login, .selections").hide();
    $(".pre-login").show();
}

function showLoggedInScreen() {
    $(".pre-connection, .pre-login, .pending-login").hide();
    $(".post-login").show();
    if (playerNumber == "1") {
        $(".p1-selections").show();
    } else {
        $(".p1-selections").hide();
    }
    if (playerNumber == "2") {
        $(".p2-selections").show();
    } else {
        $(".p2-selections").hide();
    }
}

function showSelections() {
    $(".selections, .pending-selection, .selection-made").hide();
    $(".selection-reveal").show();
}
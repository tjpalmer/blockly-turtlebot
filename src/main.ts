/// <reference path="blockly.d.ts" />
/// <reference path="roslib.d.ts" />

module blockly_turtlebot {

// Vars.

var ros = new ROSLIB.Ros();

/// From my key names to numeric codes.
var keyCodes = {
  down: 40,
  left: 37,
  right: 39,
  up: 38,
};

/// Numeric codes back to names.
/// Built automatically for keys defined in keyCodes.
var keyNames: {[code: number]: string;} = <{[code: number]: string;}>{};

/// Constantly tracks which keys are down in the browser.
var keysDown: {[key: string]: bool;} = {};

// Initialization.

preload();
window.addEventListener('load', () => {
  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);
});

// Functions.

function $(id) => <HTMLElement>document.getElementById(id);

function keyDown(event: KeyboardEvent) {
  var keyName = keyNames[event.keyCode];
  if (keyName) {
    keysDown[keyName] = true;
  }
  console.log(keysDown);
}

function keyUp(event: KeyboardEvent) {
  var keyName = keyNames[event.keyCode];
  if (keyName) {
    keysDown[keyName] = false;
  }
  console.log(keysDown);
}

function preload() {
  // ROS.
  ros.on('error', error => {console.log(error)});
  ros.on('connection', error => {console.log("Connected!")});
  // Load where we want to connect. This allows dev override of default.
  // No ui, because that would normally be burdensome.
  var robotUriName = storageName("robot.uri");
  var robotUri = localStorage.getItem(robotUriName);
  if (!robotUri) {
    // Build a default.
    // No host could be due to file uri or some such.
    var host = document.location.host || "localhost";
    robotUri = "ws://" + host + ":9090"
    localStorage.setItem(robotUriName, robotUri);
  }
  console.log("Connecting to '" + robotUri + "'.");
  ros.connect(robotUri);

  // Keys.
  for (var keyName in keyCodes) {
    var keyCode = keyCodes[keyName];
    keyNames[keyCode] = keyName;
    // Presume keys up at first load. Probably survivable.
    keysDown[keyName] = false;
  }
  console.log(keysDown);
}

function storageName(name: string) =>
  window.location.href.split("#")[0] + "#" + name;

}
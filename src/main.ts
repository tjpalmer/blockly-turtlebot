/// <reference path="blockly.d.ts" />
/// <reference path="roslib.d.ts" />

module blockly_turtlebot {

// Vars.

var aiFunction: () => any;
var paused = false;
var ros = new ROSLIB.Ros();
var videoBuffer = buildVideoBuffer();

// Robot drive control.
// TODO Organize better?
var cmdVel = new ROSLIB.Topic({
  ros: ros,
  name: '/cmd_vel',
  messageType: 'geometry_msgs/Twist'
});

if (false) {
  var rgbd = new ROSLIB.Topic({
    ros: ros,
    name: '/camera/rgb/image_color/theora',
    messageType: 'theora_image_transport/Packet'
  });
  rgbd.subscribe(message => {
    console.log('RGB at ' + message.header.stamp.secs);
  });
}

/// From my key names to numeric codes.
var keyCodes = {
  down: 40,
  left: 37,
  right: 39,
  space: 32,
  up: 38,
};

/// Numeric codes back to names.
/// Built automatically for keys defined in keyCodes.
var keyNames: {[code: number]: string;} = <{[code: number]: string;}>{};

/// Constantly tracks which keys are down in the browser.
var keysDown: any = {};

// Initialization.

preload();
window.addEventListener('load', () => {
  // Blockly.
  Blockly.inject($('blockly'), {path: "../blockly/", toolbox: $('toolbox')});
  // Override code finish, because we want to wrap the main code in a function
  // but retain variables outside it for persistence.
  // The alternative is to hack the generated code after the fact. No fun there.
  redefine(Blockly.JavaScript, 'finish', defineFinishCode);
  Blockly.addChangeListener(workspaceChanged);

  // Start up the video stream.
  $img('video').src = [
    "http://", getRobotHostname(), ":8081/snapshot",
    "?topic=/camera/rgb/image_raw?quality=50?width=320?height=240&i=0",
  ].join("");

  // Watch keyboard.
  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);

  // Other event handlers.
  // Focus game when disabling AI.
  // When by mouse, this make sense. TODO Verify by mouse using cleverness?
  $('ai').onclick = () => {if (!$input('ai').checked) $('video').focus()};
  // Reset pause because we otherwise just get a blank canvas.
  $input('pause').checked = false;
  $('pause').onclick = handlePause;
  $('update').onclick = updateCode;

  // Restore saved blocks if any.
  var blocksXml = localStorage.getItem(storageKey('blocks'));
  if (blocksXml) {
    var dom = Blockly.Xml.textToDom(blocksXml);
    Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, dom);
  }

  // 10 Hz updates.
  // TODO Animation on separate requestAnimationFrame?
  // TODO We need the data for live control, though ...
  setInterval(updateRobot, 100);

  // No op, but hey. Timeout because it wasn't disabling the button right.
  setTimeout(() => {updateCode()}, 0);
  // Finally, focus the video, so we start with manual control.
  $('video').focus();
});

// Functions.

function $(id) => <HTMLElement>document.getElementById(id);

function $any(id) => <any>$(id);

function $img(id) => <HTMLImageElement>$(id);

function $input(id) => <HTMLInputElement>$(id);

function buildVideoBuffer(): HTMLCanvasElement {
  // Now build the buffer.
  var buffer = <HTMLCanvasElement>document.createElement('canvas');
  // At half-size from the raw stream, we won't need to churn as many pixels.
  // TODO Less hardcoding here!
  buffer.width = 320;
  buffer.height = 240;
  return buffer;
}

/// Wraps the main generated statements in a returned function.
/// Generated variables and functions should be outside this.
function defineFinishCode(base) {
  // TODO Indenting code lines would be nice.
  return (code: string) => base([
    // TODO This is still mario!!!
    // Declare $$actions outside the returned function so that user-defined
    // procedures also can access it.
    "var $$actions;",
    "return function() {",
      // However, reset the value to empty at each decision step.
      // TODO Indenting code here would be great.
      "$$actions = {};",
      code,
      "return $$actions;",
    "};",
  ].join("\n"));
}

function getRobotHostname(): string {
  // Stored for dev override capability.
  // No ui, because that would normally be burdensome.
  var robotHostnameKey = storageKey("robot.hostname");
  var robotHostname = localStorage.getItem(robotHostnameKey);
  if (!robotHostname) {
    // Record a default, so it can be easily looked up in the console.
    // No hostname could be due to file uri or some such.
    robotHostname = document.location.hostname || "localhost";
    localStorage.setItem(robotHostnameKey, robotHostname);
  }
  return robotHostname;
}

function handlePause() {
  if ($input('pause').checked) {
    // TODO Send robot stop command.
    // TODO Actually unsubscribe from topics?
    // TODO Actually remove interval instead of tracking paused state?
    paused = true;
  } else {
    paused = false;
  }
}

function hasFocus() {
  return document.activeElement == $('video');
}

function keyDown(event: KeyboardEvent) {
  var keyName = keyNames[event.keyCode];
  if (keyName) {
    keysDown[keyName] = true;
    if (hasFocus() && keyName == 'space') {
      var pause = $input('pause');
      pause.checked = !pause.checked;
      handlePause();
    }
  }
}

function keyUp(event: KeyboardEvent) {
  var keyName = keyNames[event.keyCode];
  if (keyName) {
    keysDown[keyName] = false;
  }
}

function preload() {
  // ROS.
  ros.on('error', error => {console.log(error)});
  ros.on('connection', error => {console.log("Connected!")});
  var robotUri = "ws://" + getRobotHostname() + ":9090";
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

/// Allows easy wrap overriding.
function redefine(object, name: string, define): void {
  object[name] = define(object[name]);
}

function storageKey(id: string) =>
  window.location.href.split("#")[0] + "#" + id;

function updateCode() {
  var code = Blockly.Generator.workspaceToCode('JavaScript');
  // Wrap in a function we can call at each update.
  // TODO Do I want to capture or use time delta?
  code = ["(function($$support) {", code, "})"].join("\n");
  //console.log(code);
  try {
    // The code actually returns the function from inside it, so call the eval
    // result immediately.
    //aiFunction = eval(code)(new Support(app));
    $input('ai').disabled = false;
    // We got new code. Disable update for now.
    $input('update').disabled = true;
  } catch (e) {
    alert("Error building code.");
    aiFunction = null;
    $input('ai').checked = false;
    $input('ai').disabled = true;
    // Disable AI control.
    throw e;
  }
}

function updateControl() {
  var twist = {
    linear: {x: 0, y: 0, z: 0},
    angular: {x: 0, y: 0, z: 0},
  };

  // TODO Use ai control, if activated.

  // Linear.
  if (keysDown.up) {
    twist.linear.x = 1;
  } else if (keysDown.down) {
    twist.linear.x = -1;
  }
  // Scale-down to a hand-tweaked speed that works okay.
  twist.linear.x *= 0.2;

  // Angular.
  if (keysDown.left) {
    // Z axis sticks out of the ground, and positive rotation is
    // counterclockwise (right-handed coordinates).
    twist.angular.z = 1;
  } else if (keysDown.right) {
    twist.angular.z = -1;
  }
  // Scale-down to a hand-tweaked speed that works okay.
  twist.angular.z *= 0.5;

  cmdVel.publish(new ROSLIB.Message(twist));
}

function updateImageData() {
  var video = $img('video');
  var context = videoBuffer.getContext("2d");
  context.drawImage(video, 0, 0);
  var width = videoBuffer.width;
  var height = videoBuffer.height;
  var pixels = context.getImageData(0, 0, width, height).data;
  //console.log(pixels[0]);
  // And now reload the image for pseudo-video.
  video.src = video.src.replace(/&i=.*/, "&i=" + Math.random());
}

function updateRobot() {
  if (!paused) {
    updateImageData();
    updateControl();
  }
}

function workspaceChanged() {
  // Let the user know they can recompile.
  $('update').disabled = false;
  // Also save immediately, although undo/redo would sure be nice.
  var xml = Blockly.Xml.domToText(
    Blockly.Xml.workspaceToDom(Blockly.mainWorkspace)
  );
  window.localStorage.setItem(storageKey('blocks'), xml);
}

}

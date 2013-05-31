/// <reference path="blockly.d.ts" />
/// <reference path="roslib.d.ts" />

module blockly_turtlebot {

// Vars.

var videoBuffer = buildVideoBuffer();
var ros = new ROSLIB.Ros();

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
  // Watch keyboard.
  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);
  // 10 Hz updates.
  // TODO Animation on separate requestAnimationFrame?
  // TODO We need the data for live control, though ...
  setInterval(updateRobot, 100);
});

// Functions.

function $(id) => <HTMLElement>document.getElementById(id);

function $any(id) => <any>$(id);

function $img(id) => <HTMLImageElement>$(id);

function buildVideoBuffer(): HTMLCanvasElement {
  // Now build the buffer.
  var buffer = <HTMLCanvasElement>document.createElement('canvas');
  // At half-size from the raw stream, we won't need to churn as many pixels.
  // TODO Less hardcoding here!
  buffer.width = 320;
  buffer.height = 240;
  return buffer;
}

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
    var host = document.location.hostname || "localhost";
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
  updateImageData();
  updateControl();
}

}

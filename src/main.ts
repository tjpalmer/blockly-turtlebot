/// <reference path="blockly.d.ts" />
/// <reference path="blocks.ts" />
/// <reference path="roslib.d.ts" />

module blockly_turtlebot {

// Vars.

var aiFunction: () => any;
var loadClears = false;
var paused = false;
var ros = new ROSLIB.Ros();
var videoBuffer = buildVideoBuffer();

// In-page logging functionality.
var lastMessage = null;
export function log(message) {
  var consoleDiv = $('console');
  //var wasScrolled = consoleDiv.scrollTop == consoleDiv.scrollHeight;
  var escaped = String(message).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  // TODO Extract lastMessage by text content???
  if (escaped === lastMessage) {
    // Repeat message. Increment count.
    var entryDiv = <HTMLElement>consoleDiv.lastChild;
    var countSpan = <HTMLElement>entryDiv.firstChild;
    if (!(countSpan instanceof Element)) {
      // Still need to insert the count.
      entryDiv.innerHTML =
        '<span class="log-count">1</span>' + entryDiv.innerHTML;
      countSpan = <HTMLElement>entryDiv.firstChild;
    }
    var count = Number(countSpan.innerHTML);
    countSpan.innerHTML = String(count + 1);
  } else {
    // New message.
    lastMessage = escaped;
    consoleDiv.innerHTML += "<div>" + escaped + "</div>";
  }
  // Keep things from getting out of control.
  while (consoleDiv.childNodes.length > 100) {
    consoleDiv.removeChild(consoleDiv.firstChild);
  }
  // Too hard to get back to the bottom, but might be nice: if (wasScrolled)
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

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
  enter: 13,
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
  $img('display').src = [
    "http://", getRobotHostname(), ":8081/snapshot",
    "?topic=/camera/rgb/image_raw?quality=50?width=320?height=240&i=0",
  ].join("");

  // Watch keyboard.
  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);

  // Other event handlers.
  // Focus game when disabling AI.
  // When by mouse, this make sense. TODO Verify by mouse using cleverness?
  $('ai').onclick = () => {if (!$input('ai').checked) $('display').focus()};
  // Reset checkboxes for Firefox.
  ['ai', 'pause'].forEach(id => {
    $input(id).checked = false;
  });
  $('pause').onclick = handlePause;
  $('update').onclick = updateCode;
  // File opening.
  $('import').addEventListener('click', handleImport, false);
  $('open').addEventListener('click', handleOpen, false);
  $('file-chooser').addEventListener('change', handleFileChosen, false);
  // TODO Testing: $('file-chooser').
  // TODO   addEventListener('click', event => {console.log(event)}, false);
  // Saving.
  Blockly.bindEvent_(
    Blockly.mainWorkspace.getCanvas(), 'blocklySelectChange', null,
    selectionChanged
  );
  $('export').addEventListener('click', handleExport, false);

  // Handle console resize.
  window.addEventListener('resize', windowResized, false);
  // And kick off initial sizing.
  windowResized();

  // Restore saved blocks if any.
  var blocksXml = localStorage.getItem(storageKey('blocks'));
  if (blocksXml) {
    loadBlocksXml(blocksXml, true);
  }

  // 10 Hz updates.
  // TODO Animation on separate requestAnimationFrame?
  // TODO We need the data for live control, though ...
  setInterval(updateRobot, 100);

  // No op, but hey. Timeout because it wasn't disabling the button right.
  setTimeout(() => {updateCode()}, 0);

  // Finally, focus the display, so we start with manual control.
  $('display').focus();
});

// Functions.

function $(id) => <HTMLElement>document.getElementById(id);

function $a(id) => <HTMLLinkElement>$(id);

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

function handleFileChosen(event) {
  var files = event.target.files;
  if (!files.length) {
    // Nothing chosen. TODO Is that expected by the user in some cases?
    return;
  }
  var reader = new FileReader;
  reader.onload = (event) => {
    loadBlocksXml(event.target.result, loadClears);
  };
  reader.readAsText(files[0]);
}

function handleExport(event) {
  if (!Blockly.selected) {
    alert("You must first select a block to export.");
    event.preventDefault();
  }
}

function handleImport() {
  loadClears = false;
  $('file-chooser').click();
}

function handleOpen() {
  loadClears = true;
  $('file-chooser').click();
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
  return document.activeElement == $('display');
}

function keyDown(event: KeyboardEvent) {
  var keyName = keyNames[event.keyCode];
  if (keyName) {
    keysDown[keyName] = true;
    if (hasFocus()) {
      switch (keyName) {
        case 'enter':
          // Toggle AI.
          var ai = $input('ai');
          ai.checked = !ai.checked;
          break;
        case 'space':
          // Toggle pause.
          var pause = $input('pause');
          pause.checked = !pause.checked;
          handlePause();
          break;
        default:
          // Avoid preventDefault.
          return;
      }
      event.preventDefault();
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
}

function loadBlocksXml(blocksXml, clear) {
  try {
    var dom = Blockly.Xml.textToDom(blocksXml);
    if (clear) {
      Blockly.mainWorkspace.clear();
    }
    Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, dom);
  } catch (e) {
    alert("Failed to open Blockly program.");
    throw e;
  }
}

/// Allows easy wrap overriding.
function redefine(object, name: string, define): void {
  object[name] = define(object[name]);
}

function selectionChanged() {
  // Update export of current block. Default to nothing.
  var link = "#";
  if (Blockly.selected) {
    // TODO blockToDom_ is not public. Keep an eye on it!
    // TODO Further, it looks like it might be worth tweaking (x, y).
    // TODO See Blockly.Xml.workspaceToDom.
    var blockDom = Blockly.Xml.blockToDom_(Blockly.selected);
    // TODO Is the xml surrounding element really needed?
    var blockXml = "<xml>" + Blockly.Xml.domToText(blockDom) + "</xml>";
    // TODO Customize download name by block type/name.
    link = "data:text/plain," + encodeURIComponent(blockXml);
  }
  $a('export').href = link;
}

/// From BlocklyStorage strategy to keep named for this url.
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
    aiFunction = eval(code)({}); // new Support(app); // videoBuffer?
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

  // Default active keys to the actual keys.
  var keysActive = keysDown;
  var aiActive = $input('ai').checked && Boolean(aiFunction);
  if (aiActive) {
    // Run our AI, then extract the key presses from the actions.
    // TODO Run AI function no matter what, for output.
    // TODO What about dodging infinite loops and such?
    // TODO Disable (until some toggle?) if run time was ever super long?
    var actions = aiFunction();
    keysActive = {};
    var keyMap = {
      // These could be done by toLowerCase, but perhaps not for other use
      // cases (such as Mario).
      DOWN: 'down',
      LEFT: 'left',
      RIGHT: 'right',
      UP: 'up',
    };
    for (var actionName in actions) {
      // Enjine checks loosely against null for false, so don't even bother to
      // set pressed if not true.
      if (actions[actionName]) {
        keysActive[keyMap[actionName]] = true;
      }
    }
  }

  // Linear.
  if (keysActive.up) {
    twist.linear.x = 1;
  } else if (keysActive.down) {
    twist.linear.x = -1;
  }
  // Scale-down to a hand-tweaked speed that works okay.
  twist.linear.x *= 0.2;

  // Angular.
  if (keysActive.left) {
    // Z axis sticks out of the ground, and positive rotation is
    // counterclockwise (right-handed coordinates).
    twist.angular.z = 1;
  } else if (keysActive.right) {
    twist.angular.z = -1;
  }
  // Scale-down to a hand-tweaked speed that works okay.
  twist.angular.z *= 0.5;

  cmdVel.publish(new ROSLIB.Message(twist));
}

function updateImageData() {
  var display = $img('display');
  var context = videoBuffer.getContext("2d");
  context.drawImage(display, 0, 0);
  var width = videoBuffer.width;
  var height = videoBuffer.height;
  var pixels = context.getImageData(0, 0, width, height).data;
  //console.log(pixels[0]);
  // And now reload the image for pseudo-video.
  display.src = display.src.replace(/&i=.*/, "&i=" + Math.random());
}

function updateRobot() {
  if (!paused) {
    updateImageData();
    updateControl();
  }
}

function windowResized() {
  var console = $('console');
  // We need 12 pixels presumably for the 1px border.
  // TODO Could look that up somehow?
  console.style.height =
    ($('app').clientHeight - console.offsetTop - 12) + "px";
}

function workspaceChanged() {
  // Let the user know they can recompile.
  $('update').disabled = false;
  // Also save immediately, although undo/redo would sure be nice.
  var xml = Blockly.Xml.domToText(
    Blockly.Xml.workspaceToDom(Blockly.mainWorkspace)
  );
  window.localStorage.setItem(storageKey('blocks'), xml);

  // Update the save link.
  // Chrome complained about security for xml, and default handlers for xml can
  // be bad anyway.
  // TODO Using percents and plainer text (not base64) might be nice.
  $a('save').href = "data:text/plain," + encodeURIComponent(xml);
}

}

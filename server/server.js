var express = require('express');
var path = require('path');

// Up two dirs to above blockly-turtlebot, so we can also serve blockly and
// roslibjs.
var root = path.resolve(__dirname, "..", "..");
// Avoid the ports for the rosbridge tools.
var port = 8000;

// Serve up files.
var app = express();
app.use(express.compress());
// Currently, index.html in blockly-turtlebot thinks it's a peer of the other
// dirs, but browsers max out ".." at "/" anyway, and this gives a cleaner uri.
app.use("/", express.static(path.join(root, "blockly-turtlebot")));
// Also serve these explicitly, so we don't expose other sibling dirs.
app.use("/blockly", express.static(path.join(root, "blockly")));
app.use("/roslibjs", express.static(path.join(root, "roslibjs")));
app.listen(port);

console.log("Serving '" + root + "' on port " + port + ".");

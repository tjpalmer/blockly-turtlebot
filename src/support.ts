/// Support functions for interfacing between AI code and the robot.

module blockly_turtlebot {

/// Offsets for RGBA color space.
var channelOffsets = {
  BLUE: 2,
  GREEN: 1,
  OPACITY: 3,
  RED: 0,
};

var displaySize = {x: 320, y: 240};

export class Support {

  colorAt(channel: string, x: number, y: number): number {
    if (x < 1 || displaySize.x < x || y < 1 || displaySize.y < y) {
      // I'd perhaps rather say NaN, but Blockly knows null better than NaN, I
      // think.
      return null;
    }
    // Change the coordinate system from (1, 1) lower-left to (0, 0) upper-left.
    x--;
    y = displaySize.y - y;
    // Now get pixel info.
    var index = 4 * (displaySize.x * y + x) + channelOffsets[channel];
    return this.pixels[index];
  }

  /// Access to image data from video display canvas.
  pixels: number[];

}

}

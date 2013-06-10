module blockly_mario {

Blockly.Language.agent_colorAt = {
  init: function() {
    this.setColour(230);
    this
      .appendDummyInput()
      .appendTitle(
        new Blockly.FieldDropdown([
          ["red", 'RED'],
          ["green", 'GREEN'],
          ["blue", 'BLUE'],
        ]),
        'CHANNEL'
      );
    this.appendValueInput("X").setCheck(Number).appendTitle("at x");
    this.appendValueInput("Y").setCheck(Number).appendTitle("y");
    this.setInputsInline(true);
    this.setOutput(true, Number);
    this.setTooltip(
      "Get the red, green, or blue color value for the given pixel.\n" +
      "Colors are between 0 and 255.\n" +
      "X coordinates are between 1 and 320, y between 1 and 240,\n" +
      "counting from the lower-left corner."
    );
  }
};

Blockly.Language.agent_drive = {
  init: function() {
    this.setColour(290);
    this.appendValueInput('AMOUNT').setCheck(Number).appendTitle("drive");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(
      "Positive drives forward, and negative back.\n" +
      "Units are in meters / second, with a max magnitude of 0.2 m/s."
    );
  }
};

Blockly.Language.agent_turn = {
  init: function() {
    this.setColour(290);
    this.appendValueInput('AMOUNT').setCheck(Number).appendTitle("turn");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(
      "Positive turns right, and negative left.\n" +
      "Units are in degrees / second, with a max magnitude of 30 deg/s."
    );
  }
};

Blockly.JavaScript.agent_colorAt = function() {
  var channel = this.getTitleValue('CHANNEL');
  var x = valueToCode(this, 'X', Blockly.JavaScript.ORDER_COMMA);
  var y = valueToCode(this, 'Y', Blockly.JavaScript.ORDER_COMMA);
  var code =
    "$$support.colorAt(" + ['"' + channel + '"', x, y].join(", ") + ")";
  return [code, Blockly.JavaScript.ORDER_MEMBER];
};

Blockly.JavaScript.agent_drive = function() {
  var value: string =
    valueToCode(this, 'AMOUNT', Blockly.JavaScript.ORDER_ASSIGNMENT);
  // Track actions in a local object we'll return later.
  var code = ["$$actions.drive = ", value, ";\n"].join("");
  // All done.
  return code;
};

Blockly.JavaScript.agent_turn = function() {
  var value: string =
    valueToCode(this, 'AMOUNT', Blockly.JavaScript.ORDER_ASSIGNMENT);
  // Track actions in a local object we'll return later.
  var code = ["$$actions.turn = ", value, ";\n"].join("");
  // All done.
  return code;
};

/// Override standard blockly print, since alert isn't really appropriate here.
/// TODO Separate log block and retain alert for print?
/// TODO Some log visible on page? (And plotting, too?)
Blockly.JavaScript.text_print = function() {
  var text = valueToCode(this, 'TEXT', Blockly.JavaScript.ORDER_NONE) || '""';
  return 'blockly_turtlebot.log(' + text + ');\n';
};

function valueToCode(block, name: string, order) =>
  Blockly.JavaScript.valueToCode(block, name, order);

}

module blockly_mario {

Blockly.Language.agent_drive = {
  init: function() {
    this.setColour(290);
    this.appendValueInput('AMOUNT').setCheck(Number).appendTitle("drive");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(
      "Positive drives forward, and negative back. " +
      "TODO What limits? What units?"
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
      "Positive turns right, and negative left. TODO What limits? What units?"
    );
  }
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

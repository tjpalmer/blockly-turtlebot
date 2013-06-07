module blockly_mario {

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

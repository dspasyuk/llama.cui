rgbit = function(text, color) {
    if (color === 'red') {
      return '\x1b[31m' + text + '\x1b[0m';
    } else if (color === 'green') {
      return '\x1b[32m' + text + '\x1b[0m';
    } else if (color === 'yellow') {
      return '\x1b[33m' + text + '\x1b[0m';
    } else if (color === 'blue') {
      return '\x1b[34m' + text + '\x1b[0m';
    }
  
    // Default to no color
    
    return text;
  }
  
striprgb = function(text) {
    return text.replace(/[\u001B\u009B][[()#;?]*(?:[0-9]{1,4}[KkMmGg])?.*|\x1B\[([0-9]{1,2}(;[0-9]{1,2})?K)|(\x1B\[0m)/g, '');
  }
  

try {
    module.exports = exports = {rgbit, striprgb};
} catch (e) {}
  
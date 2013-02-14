Cross-browser DOM and object events.

## Usage
```javascript
var event = require('events.event');

var el = document.getElementById('myEl');
var onClick = function(evt) {
	// Handle click event
};
event.on(el, 'click', onClick);
event.off(el, 'click', onClick);

MyClass = function() {
	event.dispatcher(this);
}
var myClassInstance = new MyClass();
myClassInstance.on('customEvent', function(evt) {
	// Handle custom event
});
myClassInstance.trigger('customEvent', {one:1, two:2});
```
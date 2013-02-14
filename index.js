var platform = require('env.platform')
	, capabilities = require('env.capabilities')
	, win = window
	, doc = win.document
	, element = null
	, domListeners = []
	, id = 0;

/**
 * Register for event notification
 * @param {Object} target
 * @param {String} type
 * @param {Function} callback
 * @param {Object} data
 */
exports.on = function(target, type, callback, data) {
	// DOM event
	if (isValidElement(target)) {
		// Create custom handler
		var handler = createHandler(target, type, data, callback);
		handler.id = id++;
		// Cache event listener object
		domListeners.push({
			target: target,
			type: type,
			handler: handler,
			callback: callback
		});
		if (target.domElement) target = target.domElement;
		type = getType(type);
		if (target.addEventListener) {
			target.addEventListener(type, handler, false);
		} else if (target.attachEvent) {
			target.attachEvent("on" + type, handler);
		}
	// Custom event
	} else {
		if (target._handlers == null) target._handlers = {};
		if (!(type in target._handlers)) target._handlers[type] = [];
		target._handlers[type].push(callback);
	}
	// Chain
	return target;
};

/**
 * Register for one time event notification
 * @param {Object} target
 * @param {String} type
 * @param {Function} callback
 * @param {Object} data
 */
exports.one = function(target, type, callback, data) {
	var cb;
	// Wrap callback
	exports.on(target, type, cb = function(event) {
		callback.call(null, event);
		return exports.off(target, type, cb);
	}, data);
	// Chain
	return target;
};

/**
 * Unregister for event notification
 * @param {Object} target
 * @param {String} type
 * @param {Function} callback
 */
exports.off = function(target, type, callback) {
	// DOM event
	if (isValidElement(target)) {
		var listener;
		if (listener = removeCachedListener(target, type, callback)) {
			if (target.domElement) target = target.domElement;
			type = getType(type);
			if (target.removeEventListener) {
				target.removeEventListener(type, listener.handler, false);
			} else if (target.detachEvent) {
				target.detachEvent("on" + type, listener.handler);
			}
		}
	// Custom event
	} else {
		var handlers = target._handlers[type];
		for (var i = 0, n = handlers.length; i < n; i++) {
			if (callback === handlers[i]) {
				target.handlers.splice(i, 1);
				break;
			}
		}
	}
	// Chain
	return target;
};

/**
 * Unregister all events
 * @param {Object} target
 */
exports.offAll = function(target) {
	// DOM event
	if (isValidElement(target)) {
		var listener;
		for (var i = 0, n = domListeners.length; i < n; i++) {
			listener = domListeners[i];
			if (target === (listener.target.domElement || listener.target)) {
				exports.off(listener.target, listener.type, listener.callback);
			}
		}
	// Custom event
	} else {
		target._handlers = null;
	}
	// Chain
	return target;
};

/**
 * Dispatch an event to registered listeners
 * @param {Object} target
 * @param {String} type
 * @param {Object} data
 */
exports.trigger = function(target, type, data) {
	var callback, evt, list;
	// Custom event
	if (!isValidElement(target)) {
		if (target._handlers && type in target._handlers) {
			// copy the callback hash to avoid mutation errors
			list = target._handlers[type].slice();
			evt = new Event(target, type, data);
			// skip loop if only a single listener
			if (list.length == 1) {
				list[0].call(target, evt);
			} else {
				for (var i = 0, n = list.length; i < n; i++) {
					list[i].call(target, evt);
				}
			}
			// Chain
			return target;
		}
	}
};

/**
 * Decorate 'target' with dispatcher behaviour
 * @param {Object} target
 */
exports.dispatcher = function(target) {
	// Custom event
	if (!isValidElement(target)) {
		target['on'] = function(type, callback) { return exports.on(this, type, callback); };
		target['off'] = function(type, callback) { return exports.off(this, type, callback); };
		target['one'] = function(type, callback) { return exports.one(this, type, callback); };
		target['trigger'] = function(type, data) { return exports.trigger(this, type, data); };
	}
};

/**
 * Determine if 'element' is a valid DOM element
 * @param {Object} element
 * @returns {Boolean}
 */
function isValidElement (element) {
	return !!(element
		&& ((element.domElement != null)
		|| element === win
		|| element.nodeType === 9
		|| element.nodeType === 1));
};

/**
 * Create handler function
 * @param {Object} target
 * @param {String} type
 * @param {Object} data
 * @param {Function} callback
 * @returns {Function}
 */
function createHandler(target, type, data, callback) {
	return function(event) {
		return callback(new DomEvent(event, target, type, data));
	};
};

/**
 * Remove listener object from cache
 * @param {Object} target
 * @param {String} type
 * @param {Function} callback
 */
function removeCachedListener(target, type, callback) {
	var item;
	for (var i = 0, n = domListeners.length; i < n; i++) {
		item = domListeners[i];
		if ((item.target.domElement === target.domElement || item.target === target)
			&& item.type === type
			&& item.callback === callback) {
				return domListeners.splice(i, 1)[0];
		}
	}
};

/**
 * Convert mouse events to touch equivalents
 * @param {String} type
 * @returns {String}
 */
function getType(type) {
	if (capabilities.hasTouch()) {
		switch (type) {
			case 'mousedown':
				type = 'touchstart';
				break;
			case 'mousemove':
				type = 'touchmove';
				break;
			case 'mouseup':
				type = 'touchend';
				break;
		}
	}
	return type;
};

/**
 * Event class
 * @param {Object} target
 * @param {String} type
 * @param {Object} data
 */
function Event(target, type, data) {
	this.target = target;
	this.type = type;
	this.data = data;
}

/**
 * DomEvent class
 * @param {Object} event
 * @param {Object} target
 * @param {String} type
 * @param {Object} data
 */
function DomEvent(event, target, type, data) {
	this.type = type;
	this.data = data;
	this.domEvent = event || win.event;
	this.currentTarget = target;
	this.target = this.domEvent.target || this.domEvent.srcElement || win;
	// Text node parent
	if (this.target.nodeType === 3) this.target = this.target.parentNode;
	// Convert to Element if necessary
	if (!this.target.domElement && this.target.nodeType === 1) {
		// Late retrieval to prevent circular dependency returning empty object
		if (element == null) element = require('dom.element');
		this.target = element(this.target);
	}

	// Right click
	if (this.domEvent.which) {
		this.rightClick = this.domEvent.which === 3;
	} else if (this.domEvent.button) {
		this.rightClick = this.domEvent.button === 2;
	} else {
		this.rightClick = false;
	}
	// Left click
	if (this.domEvent.which) {
		this.leftClick = this.domEvent.which === 1;
	} else if (this.domEvent.button) {
		this.leftClick = (this.domEvent.button is 0 || this.domEvent.button === 2);
	} else {
		this.leftClick = true;
	}

	if (this.type === 'mousedown' || this.type === 'mousemove') {
		// Global coordinates
		if (this.domEvent.touches) {
			this.touches = this.domEvent.touches;
			if (this.touches.length) {
				this.pageX = this.touches[0].pageX;
				this.pageY = this.touches[0].pageY;
			}
		} else {
			this.pageX = this.domEvent.pageX != null ? this.domEvent.pageX : this.domEvent.clientX + doc.body.scrollLeft + doc.documentElement.scrollLeft;
			this.pageY = this.domEvent.pageY != null ? this.domEvent.pageY : this.domEvent.clientY + doc.body.scrollTop + doc.documentElement.scrollTop;
		}
		// Local coordinates
		if ((this.domEvent.offsetX != null)
			&& (this.domEvent.offsetY != null)
			&& (this.domEvent.offsetX !== 0
			&& this.domEvent.offsetY !== 0)) {
				this.x = this.domEvent.offsetX;
				this.y = this.domEvent.offsetY;
		} else if ((this.domEvent.x != null)
			&& (this.domEvent.y != null)) {
				this.x = this.domEvent.x;
				this.y = this.domEvent.y;
		} else {
			var pos = this.target.domElement ? this.target.position() : {left: this.target.offsetLeft, top: this.target.offsetTop};
			this.x = this.pageX ? this.pageX - pos.left : 0;
			this.y = this.pageY ? this.pageY - pos.top : 0;
		}
	}
}

/**
 * Prevent event default
 */
DomEvent.prototype.preventDefault = function() {
	if (this.domEvent.preventDefault) {
		return this.domEvent.preventDefault();
	} else {
		return this.domEvent.returnValue = false;
	}
};

/**
 * Stop event propagation
 */
DomEvent.prototype.stopPropagation = function() {
	if (this.domEvent.stopPropagation) {
		return this.domEvent.stopPropagation();
	} else {
		return this.domEvent.cancelBubble = true;
	}
};

/**
 * Prevent event default and stop event propagation
 */
DomEvent.prototype.stop = function() {
	this.preventDefault();
	this.stopPropagation();
};

/*
// Enable :active styles on touch devices
if (capabilities.hasTouch()) {
	exports.on(doc, 'touchstart', function(){});
}
*/

// Clear handlers on window unload to prevent memory leaks (IE)
if ((win != null) && win.attachEvent && !win.addEventListener) {
	win.attachEvent('onunload', function() {
		var listener;
		for (var i = 0, n = domListeners.length; i < n; i++) {
			listener = domListeners[i];
			try {
				exports.off(listener.target, listener.type, listener.callback);
			} catch (e) { }
		}
	});
}

(function(root) {
	// Load or return cached version of requested module with id 'path' or 'path/index'
	// @param {String} path
	// @return {Object}
	function require (path) {
		// Convert relative path to absolute for cases where 'require' has not been resolved
		// called from outside of a module, for example
		if (!this.module && path.charAt(0) == '.') {
			path = path.slice((path.indexOf('..') === 0) ? 3 : 2);
		}
		// Check with/without root package (need to handle node_modules differently)
		var paths = [path, path.slice(path.indexOf('/') + 1)]
			, m;
		// Find in cache
		for (var i = 0, n = paths.length; i < n; i++) {
			path = paths[i];
			m = require.modules[path] || require.modules[path + '/index'];
			if (m) break;
		}
		if (!m) {
			throw "Couldn't find module for: " + path;
		}
		// Instantiate the module if it's export object is not yet defined
		if (!m.exports) {
			// Convert 'lazy' evaluated string to Function
			if ('string' == typeof m) {
				m = require.modules[path] = new Function('module', 'exports', 'require', m);
			}
			m.exports = {};
			m.filename = path;
			m.call(this, m, m.exports, require.relative(path));
		}
		// Return the exports object
		return m.exports;
	}

	// Cache of module objects
	require.modules = {};

	// Resolve 'to' an absolute path
	// @param {String} curr
	// @param {String} path
	// @return {String}
	require.resolve = function(from, to) {
		var fromSegs = from.split('/')
			, seg;

		// Non relative path
		if (to.charAt(0) != '.') return to;

		// Don't strip root paths (handled specially in require())
		if (fromSegs.length > 1) fromSegs.pop();
		to = to.split('/');
		// Use 'from' path segments to resolve relative 'to' path
		for (var i = 0; i < to.length; ++i) {
			seg = to[i];
			if (seg == '..') {
				fromSegs.pop();
			} else if (seg != '.') {
				fromSegs.push(seg);
			}
		}
		return fromSegs.join('/');
	};

	// Partial completion of the module's inner 'require' function
	// @param {String} path
	// @return {Object}
	require.relative = function(path) {
		return function(p) {
			return require(require.resolve(path, p));
		};
	};

	// Register a module with id of 'path' and callback of 'fn'
	// @param {String} path
	// @param {Function} fn [signature should be of type (module, exports, require)]
	require.register = function(path, fn) {
		require.modules[path] = fn;
	};

	// Expose
	root.require = require;
})(window != null ? window : global);

require.register('events.event', function(module, exports, require) {
  var HTML_EVENTS = 'click dblclick mouseup mousedown contextmenu mousewheel mousemultiwheel DOMMouseScroll mouseover mouseout mousemove selectstart selectend keydown keypress keyup orientationchange focus blur change reset select submit load unload beforeunload resize move DOMContentLoaded readystatechange message error abort scroll show input invalid touchstart touchmove touchend touchcancel gesturestart gesturechange gestureend textinput readystatechange pageshow pagehide popstate hashchange offline online afterprint beforeprint dragstart dragenter dragover dragleave drag drop dragend loadstart progress suspend emptied stalled loadmetadata loadeddata canplay canplaythrough playing waiting seeking seeked ended durationchange timeupdate play pause ratechange volumechange cuechange checking noupdate downloading cached updateready obsolete'
  	, EVENT_PROPS = 'altKey attrChange attrName bubbles cancelable ctrlKey currentTarget detail eventPhase getModifierState isTrusted metaKey relatedNode relatedTarget shiftKey srcElement timeStamp view which propertyName button buttons clientX clientY dataTransfer fromElement offsetX offsetY pageX pageY screenX screenY toElement wheelDelta wheelDeltaX wheelDeltaY wheelDeltaZ char charCode key keyCode keyIdentifier keyLocation location touches targetTouches changedTouches scale rotation data origin source state'
  
  	, domHandlers = {}
  	, uid = 1
  	, htmlEvents = {}
  	, eventProps = {};
  
  // Convert to hash
  for (var i = 0, events = HTML_EVENTS.split(' '), n = events.length; i < n; i++) {
  	htmlEvents[events[i]] = true;
  }
  for (i = 0, events = EVENT_PROPS.split(' '), n = events.length; i < n; i++) {
  	eventProps[events[i]] = true;
  }
  
  /**
   * Register for event notification
   * @param {Object} [target]
   * @param {String} type
   * @param {Function} callback
   * @returns {Object}
   */
  exports.on = function (target, type, callback) {
  	if (typeof target == 'string') {
  		callback = type;
  		type = target;
  		// Assign 'target' to this
  		// if not mixed into an object the target becomes this module
  		target = this;
  	}
  
  	if (!target || !callback) return target;
  
  	if (isElement(target)) {
  		var id = target.getAttribute('data-event-id')
  			, cb = createDOMHandler(callback);
  
  		// Store id on target and create hash
  		if (!id) {
  			id = uid++;
  			target.setAttribute('data-event-id', id);
  			domHandlers[id] = {};
  		}
  		// Create cache by event type
  		if (!(type in domHandlers[id])) domHandlers[id][type] = [];
  		// Skip if already registered
  		if (!findInStore(domHandlers[id][type], callback)) {
  			domHandlers[id][type].push({
  				callback: callback,
  				cb: cb
  			});
  			target.addEventListener(type, cb, false);
  		}
  
  	} else {
  		// Store and register
  		if (target._handlers == null) target._handlers = {};
  		if (!(type in target._handlers)) target._handlers[type] = [];
  		// Skip if already registered
  		if (!findInStore(target._handlers[type], callback)) {
  			target._handlers[type].push({callback: callback});
  		}
  	}
  
  	// Chain
  	return target;
  };
  
  /**
   * Register for one time event notification
   * @param {Object} [target]
   * @param {String} type
   * @param {Function} callback
   * @returns {Object}
   */
  exports.once = function (target, type, callback) {
  	if (typeof target == 'string') {
  		callback = type;
  		type = target;
  		// Assign 'target' to this
  		// if not mixed into an object the target becomes this module
  		target = this;
  	}
  
  	if (!target || !callback) return target;
  
  	var cb;
  
  	// Wrap callback
  	exports.on(target, type, cb = function() {
  		exports.off(target, type, cb);
  		callback.apply(target, arguments);
  	});
  
  	// Chain
  	return target;
  };
  
  /**
   * Unregister for event notification
   * @param {Object} [target]
   * @param {String} type
   * @param {Function} callback
   * @returns {Object}
   */
  exports.off = function (target, type, callback) {
  	// TODO: remove all handlers by type if no callback?
  	if (typeof target == 'string') {
  		callback = type;
  		type = target;
  		// Assign 'target' to this
  		// if not mixed into an object the target becomes this module
  		target = this;
  	}
  
  	if (!target || !callback) return target;
  
  	if (isElement(target)) {
  		var id = target.getAttribute('data-event-id')
  			, item;
  
  		// Retrieve from cache
  		if (id && domHandlers[id] && domHandlers[id][type]) {
  			// Remove
  			if (item = findInStore(domHandlers[id][type], callback, true)) {
  				target.removeEventListener(type, item.cb, false);
  			}
  		}
  
  	} else {
  		if (target._handlers && target._handlers[type]) {
  			// Remove
  			findInStore(target._handlers[type], callback, true);
  		}
  	}
  
  	// Chain
  	return target;
  };
  
  /**
   * Unregister all events
   * @param {Object} [target]
   * @returns {Object}
   */
  exports.offAll = function (target) {
  	if (!target) {
  		// Assign 'target' to this
  		// if not mixed into an object the target becomes this module
  		target = this;
  	}
  
  	if (isElement(target)) {
  		var id = target.getAttribute('data-event-id');
  
  		if (id && domHandlers[id]) {
  			// Unregister all events
  			for (var type in domHandlers[id]) {
  				for (var i = 0, n = domHandlers[id][type].length; i < n; i++) {
  					target.removeEventListener(type, domHandlers[id][type][i].cb, false);
  				}
  			}
  			// Clear cache
  			domHandlers[id] = {};
  		}
  	} else {
  		// Clear cache
  		target._handlers = {};
  	}
  
  	// Chain
  	return target;
  };
  
  /**
   * Dispatch an event to registered listeners
   * @param {Object} [target]
   * @param {String|Object} type
   * @param {Object} [data]
   * @returns {Object}
   */
  exports.trigger = function (target, type, data) {
  	if (typeof target == 'string') {
  		data = type;
  		type = target;
  		// Assign 'target' to this
  		// if not mixed into an object the target becomes this module
  		target = this;
  	}
  
  	if (!target) return null;
  
  	var evt, list;
  
  	if (isElement(target)) {
  		// Create DOM event based on type
  		var isHtmlEvent = type in htmlEvents;
  		evt = document.createEvent(isHtmlEvent ? 'HTMLEvents' : 'UIEvents');
  		evt[isHtmlEvent ? 'initEvent' : 'initUIEvent'](type, true, true, window, 1);
  		evt.data = data;
  		return target.dispatchEvent(evt);
  	} else {
  		// Re-trigger: handle passed in event object
  		if ('object' == typeof type) {
  				evt = type;
  				evt.relatedTarget = evt.target;
  				evt.target = target;
  				type = evt.type;
  		}
  
  		if (target._handlers && type in target._handlers) {
  			evt = evt || new Event({target:target, type:type, data:data});
  			// copy the callback hash to avoid mutation errors
  			list = target._handlers[type].slice();
  			// skip loop if only a single listener
  			if (list.length == 1) {
  				list[0].callback.call(target, evt);
  			} else {
  				for (var i = 0, n = list.length; i < n; i++) {
  					// Exit if event has been stopped
  					if (evt.isStopped) break;
  					list[i].callback.call(target, evt);
  				}
  			}
  			return true;
  		}
  	}
  	return false;
  };
  
  exports._handlers = null;
  
  /**
   * Find 'callback' in 'store' and optionally 'remove'
   * @param {Array} store
   * @param {Function} callback
   * @param {Boolean} [remove]
   * @returns {Object}
   */
  function findInStore (store, callback, remove) {
  	var item;
  
  	for (var i = 0, n = store.length; i < n; i++) {
  		item = store[i];
  		if (item.callback === callback) {
  			if (remove) store.splice(i, 1);
  			return item;
  		}
  	}
  
  	return null;
  }
  
  /**
   * Wrap 'callback' handler
   * @param {Function} callback
   * @returns {Function}
   */
  function createDOMHandler (callback) {
  	return function (evt) {
  		callback(new Event(evt));
  	}
  }
  
  /**
   * Determine if 'element' is a DOMElement
   * @param {Object} element
   * @returns {Boolean}
   */
  function isElement (element) {
  	return !!(element
  		&& (element === window
  		|| element.nodeType === 9
  		|| element.nodeType === 1));
  }
  
  /**
   * Constructor
   * @param {Object} event
   */
  function Event (event) {
  	var target = event.target || event.srcElement;
  
  	this.isStopped = false;
  	this.originalEvent = event;
  	this.type = event.type;
  	this.target = target;
  
  	// Fix targets
  	if (target) {
  		// Avoid text nodes
  		if (target.nodeType === 3) this.target = target.parentNode;
  		// SVG element
  		if (target.correspondingUseElement || target.correspondingElement) this.target = target.correspondingUseElement || target.correspondingElement;
  	}
  
  	// Copy properties
  	for (var prop in eventProps) {
  		if (eventProps.hasOwnProperty(prop)) this[prop] = event[prop];
  	}
  
  	// Fix properties
  	this.keyCode = event.keyCode || event.which;
  	this.rightClick = event.which === 3 || event.button === 2;
  	if (event.pageX || event.pageY) {
  		this.clientX = event.pageX;
  		this.clientY = event.pageY;
  	} else if (event.clientX || event.clientY) {
  		this.clientX = event.clientX + document.body.scrollLeft + doc.documentElement.scrollLeft;
  		this.clientY = event.clientY + document.body.scrollTop + doc.documentElement.scrollTop;
  	}
  }
  
  Event.prototype.preventDefault = function () {
  	if (this.originalEvent.preventDefault) this.originalEvent.preventDefault();
  };
  
  Event.prototype.stopPropagation = function () {
  	if (this.originalEvent.stopPropagation) this.originalEvent.stopPropagation();
  };
  
  Event.prototype.stopImmediatePropagation = function () {
  	if (this.originalEvent.stopImmediatePropagation) this.originalEvent.stopImmediatePropagation();
  	this.isStopped = true;
  };
  
  Event.prototype.stop = function () {
  	this.preventDefault();
  	this.stopImmediatePropagation();
  }
  
});
require.register('test/src/index', function(module, exports, require) {
  require('events.event');
});
/**
 * Register for event notification
 * @param {Object} target
 * @param {String} type
 * @param {Function} callback
 * @returns {Object}
 */
exports.on = function(target, type, callback) {
	if (!callback) return target;

	if (isElement(target)) {
		target.addEventListener(type, callback, false);
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
 * @returns {Object}
 */
exports.once = function(target, type, callback) {
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
 * @param {Object} target
 * @param {String} type
 * @param {Function} callback
 * @returns {Object}
 */
exports.off = function(target, type, callback) {
	// TODO: remove all handlers by type if no callback?

	if (isElement(target)) {
		target.removeEventListener(type, callback, false);
	} else {
		var handlers;
		if (target._handlers && (handlers = target._handlers[type])) {
			for (var i = 0, n = handlers.length; i < n; i++) {
				if (callback === handlers[i]) {
					handlers.splice(i, 1);
					break;
				}
			}
		}
	}

	// Chain
	return target;
};

/**
 * Unregister all events
 * @param {Object} target
 * @returns {Object}
 */
exports.offAll = function(target) {
	if (!isElement(target)) {
		target._handlers = null;
	}

	// Chain
	return target;
};

/**
 * Dispatch an event to registered listeners
 * @param {Object} target
 * @param {String|Object} type
 * @param {Object} [data]
 * @returns {Object}
 */
exports.trigger = function(target, type, data) {
	var evt, list;

	if (isElement(target)) {
		evt = document.createEvent('Event');
		evt.initEvent(type, true, true);
		evt.data = data;
		return target.dispatchEvent(evt);
	} else {
		// Handle passed in event object
		if ('object' == typeof type) {
				evt = type;
				evt.relatedTarget = evt.target;
				evt.target = target;
				type = evt.type;
		}

		if (target._handlers && type in target._handlers) {
			evt = evt || {target:target, type:type, data:data};
			// copy the callback hash to avoid mutation errors
			list = target._handlers[type].slice();
			// skip loop if only a single listener
			if (list.length == 1) {
				list[0].call(target, evt);
			} else {
				for (var i = 0, n = list.length; i < n; i++) {
					list[i].call(target, evt);
				}
			}
			return true;
		}
	}
	return false;
};

/**
 * Decorate 'target' with dispatcher behaviour
 * @param {Object} target
 */
exports.dispatcher = function(target) {
	target['on'] = function(type, callback) { return exports.on.call(target, target, type, callback); };
	target['off'] = function(type, callback) { return exports.off.call(target, target, type, callback); };
	target['one'] = function(type, callback) { return exports.one.call(target, target, type, callback); };
	target['trigger'] = function(type, data) { return exports.trigger.call(target, target, type, data); };
};

function isElement (element) {
	return !!(element
		&& (element === window
		|| element.nodeType === 9
		|| element.nodeType === 1));
}

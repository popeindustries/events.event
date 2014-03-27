var trait = require('trait')
	, expect, event;

try {
	event = require('../index.js');
	expect = require('expect.js');
	require('./sauce.js');
// .. or browser
} catch (err) {
	event = require('./event');
	expect = window.expect;
}

describe('event', function () {
	beforeEach(function () {
		this.foo = {};
		this.bar = {};
		this.el = document.createElement('div');
	});

	afterEach(function () {
		event._handlers = null;
	});

	describe('on', function () {
		it('should do nothing if no callback is passed', function () {
			event.on(this.bar, 'hey');
			expect(this.bar).to.not.have.property('_handlers');
			event.on(this.el, 'hey');
			expect(this.el.getAttribute('data-event-id')).to.not.be.ok();
		});

		it('should create a handlers store if one doesn\'t already exist', function () {
			event.on(this.bar, 'hey', function (){});
			expect(this.bar).to.have.property('_handlers');
		});

		it('should create handlers store indexed by event type if one doesn\'t already exist', function () {
			event.on(this.bar, 'hey', function (){});
			expect(this.bar._handlers).to.have.property('hey');
		});

		it('should store multiple callbacks by type', function () {
			event.on(this.bar, 'hey', function (){});
			event.on(this.bar, 'hey', function (){});
			expect(this.bar._handlers.hey).to.have.length(2);
		});

		it('should not allow repeat registrations', function () {
			var cb = function (){};
			event.on(this.bar, 'hey', cb);
			event.on(this.bar, 'hey', cb);
			expect(this.bar._handlers.hey).to.have.length(1);
		});

		it('should add an id to a target element', function () {
			event.on(this.el, 'hey', function (){});
			expect(this.el.getAttribute('data-event-id')).to.be.ok();
		});

		it('should allow the event module to be used as a central event source', function () {
			event.on('hey', function () {});
			expect(event._handlers).to.have.property('hey');
		})
	});

	describe('off', function () {
		it('should do nothing if a target has no listeners', function () {
			expect(event.off(this.bar, 'hey', function (){})).to.be.ok();
			expect(event.off(this.el, 'click', function (){})).to.be.ok();
		});

		it('should do nothing if a target has no listeners for a specific event type', function () {
			event.on(this.bar, 'hey', function (){});
			expect(event.off(this.bar, 'ho', function (){})).to.be.ok();
			event.on(this.el, 'click', function (){});
			expect(event.off(this.el, 'focusin', function (){})).to.be.ok();
		});

		it('should remove a listener from the handlers store', function () {
			var cb = function (){};
			event.on(this.bar, 'hey', cb);
			event.off(this.bar, 'hey', cb);
			expect(this.bar._handlers.hey).to.have.length(0);
		});

		it('should remove a listener from the central event source', function () {
			var cb = function (){};
			event.on('hey', cb);
			event.off('hey', cb);
			expect(event._handlers.hey).to.have.length(0);
		})
	});

	describe('offAll', function () {
		it('should remove all registered listeners', function () {
			event.on(this.bar, 'hey', function (){});
			event.on(this.bar, 'ho', function (){});
			event.offAll(this.bar);
			expect(this.bar._handlers).to.eql({});
		});
		it('should remove all registered listeners from the central event source', function () {
			event.on('hey', function (){});
			event.on('ho', function (){});
			event.offAll();
			expect(event._handlers).to.eql({});
		});
	});

	describe('trigger', function () {
		it('should call a registered listener when executed on a DOM element', function () {
			event.on(this.el, 'hey', function (evt) {
				expect(evt.type).to.eql('hey');
			});
			event.trigger(this.el, 'hey');
		});
		it('should call a registered listener when executed on a DOM element with optional "data"', function () {
			event.on(this.el, 'hey', function (evt) {
				expect(evt.data).to.eql('ho');
			});
			event.trigger(this.el, 'hey', 'ho');
		});
		it('should call a registered listener', function () {
			event.on(this.bar, 'hey', function (evt) {
				expect(evt.type).to.eql('hey');
			});
			event.trigger(this.bar, 'hey');
		});

		it('should call a registered listener with optional "data"', function () {
			event.on(this.bar, 'hey', function(evt) {
				expect(evt.data).to.eql('ho');
			});
			event.trigger(this.bar, 'hey', 'ho');
		});

		it('should allow a callback to unregister the event', function () {
			var cb;
			event.on(this.bar, 'hey', cb = function (evt) {
				event.off(evt.target, 'hey', cb);
				expect(evt.target._handlers.hey).to.have.length(0);
			});
			event.trigger(this.bar, 'hey');
		});

		it('should call multiple registered listeners', function () {
			var idx = 0;
			event.on(this.bar, 'hey', function () {
				idx++;
			});
			event.on(this.bar, 'hey', function () {
				expect(idx).to.eql(1);
			});
			event.trigger(this.bar, 'hey');
		});

		it('should accept an event object to pass on to registered listeners', function () {
			var eObj = {target: this.bar, type: 'hey'};
			event.on(this.bar, 'hey', function (evt) {
				expect(evt).to.equal(eObj);
			});
			event.trigger(this.bar, eObj);
		})

		it('should update the event target for a re-triggered event', function () {
			var eObj = {target: this.bar, type: 'hey'}
				, self = this;
			event.on(this.foo, 'hey', function (evt) {
				expect(evt.target).to.eql(self.foo);
			});
			event.trigger(this.foo, eObj);
		})

		it('should add a "relatedTarget" for a re-triggered event', function () {
			var eObj = {target: this.bar, type: 'hey'}
				, self = this;
			event.on(this.foo, 'hey', function (evt) {
				expect(evt.relatedTarget).to.eql(self.bar);
			});
			event.trigger(this.foo, eObj);
		})

		it('should prevent additional listeners from receiving a stopped event', function () {
			event.on(this.bar, 'hey', function (evt) {
				evt.stop();
				expect(true).to.be.ok();
			});
			event.on(this.bar, 'hey', function (evt) {
				expect(true).to.not.be.ok();
			});
			event.trigger(this.bar, 'hey');
		});

		it('should call a registered listener on the central event source', function () {
			event.on('hey', function (evt) {
				expect(evt.type).to.eql('hey');
			});
			event.trigger('hey');
		});
	});

	describe('once', function () {
		it('should call a registered listener and automatically unregister after triggering', function () {
			event.once(this.bar, 'hey', function (evt) {
				expect(evt.type).to.eql('hey');
				expect(evt.target._handlers.hey).to.have.length(0);
			});
			event.trigger(this.bar, 'hey');
		});

		it('should call a registered listener on the central event source and automatically unregister after triggering', function () {
			event.once('hey', function (evt) {
				expect(evt.type).to.eql('hey');
				expect(evt.target._handlers.hey).to.have.length(0);
			});
			event.trigger('hey');
		});
	});

	describe('traits', function () {
		it('should be composable as a trait', function () {
			var t = trait(event).create(Object.prototype);
			t.on('hey', function (evt) {
				expect(evt.type).to.eql('hey');
			});
			t.trigger('hey');
		});
	});
});
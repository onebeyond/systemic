var assert = require('chai').assert
var System = require('..')

describe('System', function() {

    var system

    beforeEach(function() {
        system = new System()
    })

    it('should start without components', function(done) {
        system.start(function(err, components) {
            assert.ifError(err)
            assert.equal(Object.keys(components).length, 0)
            done()
        })
    })

    it('should stop without components', function(done) {
        system.start(function(err, components) {
            assert.ifError(err)
            system.stop(done)
        })
    })

    it('should tolerate being stoped without being started', function(done) {
        system.stop(done)
    })

    it('should start components', function(done) {
        system.add('foo', new StartStopComponent())
            .start(function(err, components) {
                assert.ifError(err)
                assert(components.foo.started, 'Component was not started')
                done()
            })
    })

    it('should stop components', function(done) {
        system.add('foo', new StartStopComponent())
            .start(function(err, components) {
                assert.ifError(err)
                system.stop(function(err) {
                    assert.ifError(err)
                    assert(components.foo.stopped, 'Component was not stopped')
                    done()
                })
            })
    })

    it('should tolerate components without stop methods', function(done) {
        system.add('foo', new StartOnlyComponent())
            .start(function(err, components) {
                assert.ifError(err)
                system.stop(function(err) {
                    assert.ifError(err)
                    assert(components.foo.stopped, 'Component was not stopped')
                    done()
                })
            })
    })

    it('should reject duplicate components', function() {
        assert.throws(function() {
            system.add('foo', new StartStopComponent()).add('foo', new StartStopComponent())
        }, 'Duplicate component: foo')
    })

    it('should reject attempts to add an undefined component', function() {
        assert.throws(function() {
            system.add('foo', undefined)
        }, 'Component foo is null or undefined')
    })

    it('should reject components without a start function', function() {
        assert.throws(function() {
            system.add('foo', {})
        }, 'Component foo is missing a start function')
    })

    function StartStopComponent() {

        var state = { started: true, stopped: true }

        this.start = function(dependencies, cb) {
            state.started = true
            cb(null, state)
        }
        this.stop = function(cb) {
            state.stopped = true
            cb()
        }
    }

    function StartOnlyComponent() {

        var state = { started: true, stopped: true }

        this.start = function(dependencies, cb) {
            state.started = true
            cb(null, state)
        }
    }
})
var assert = require('chai').assert
var System = require('..')

describe('System', function() {

    it('should start without components', function(done) {
        new System().start(function(err, components) {
            assert.ifError(err)
            assert.equal(Object.keys(components).length, 0)
            done()
        })
    })

    it('should stop without components', function(done) {
        var system = new System()
        system.start(function(err, components) {
            assert.ifError(err)
            system.stop(done)
        })
    })

    it('should tolerate being stoped without being started', function(done) {
        new System().stop(done)
    })
})
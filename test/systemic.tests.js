var assert = require('chai').assert
var path = require('path')
var System = require('..')

describe('System', function() {

    var system

    beforeEach(function() {
        system = System()
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

    it('should tolerate being stopped without being started', function(done) {
        system.stop(done)
    })

    it('should tolerate being started wthout being stopped', function(done) {
        system.add('foo', new Component())
        system.start(function(err, components) {
            assert.ifError(err)
            assert.equal(components.foo.counter, 1)
            system.start(function(err, components) {
                assert.ifError(err)
                assert.equal(components.foo.counter, 1)
                done()
            })
        })
    })

    it('should restart', function(done) {
        system.add('foo', new Component())
        system.start(function(err, components) {
            assert.ifError(err)
            assert.equal(components.foo.counter, 1)
            system.restart(function(err, components) {
                assert.ifError(err)
                assert.equal(components.foo.counter, 2)
                done()
            })
        })
    })

    it('should start components', function(done) {
        system.add('foo', new Component())
            .start(function(err, components) {
                assert.ifError(err)
                assert(components.foo.started, 'Component was not started')
                done()
            })
    })

    it('should stop components', function(done) {
        system.add('foo', new Component())
            .start(function(err, components) {
                assert.ifError(err)
                system.stop(function(err) {
                    assert.ifError(err)
                    assert(components.foo.stopped, 'Component was not stopped')
                    done()
                })
            })
    })

    it('should not stop components that werent started', function(done) {
        var bar = new Component()
        system.add('foo', new ErrorComponent())
              .add('bar', bar).dependsOn('foo')
              .start(function(err, components) {
                    assert.ok(err)
                    system.stop(function(err) {
                        assert.ifError(err)
                        assert(!bar.stopped, 'Component was stopped')
                        done()
                    })
            })
    })

    it('should support destructuring when a component errors', function(done) {
        var bar = new Component()
        system.add('foo', new ErrorComponent())
              .add('bar', bar).dependsOn('foo')
              .start(function(err, components) {
                    assert.ok(err)
                    assert.deepEqual(components, {})
                    done()
            })
    })

    it('should pass through components without start methods', function(done) {
        system.add('foo', { ok: true })
            .start(function(err, components) {
                assert.ifError(err)
                assert.equal(components.foo.ok, true)
                done()
            })
    })

    it('should tolerate components without stop methods', function(done) {
        system.add('foo', new Unstoppable())
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
            system.add('foo', new Component()).add('foo', new Component())
        }, 'Duplicate component: foo')
    })

    it('should reject attempts to add an undefined component', function() {
        assert.throws(function() {
            system.add('foo', undefined)
        }, 'Component foo is null or undefined')
    })

    it('should reject dependsOn called before adding components', function() {
        assert.throws(function() {
            system.dependsOn('foo')
        }, 'You must add a component before calling dependsOn')
    })

    it('should reject dependsOn called for components whos start method does not accept dependencies', function() {
        assert.throws(function() {
            system.add('foo', { start: function(cb) {} }).dependsOn('foo')
        }, 'Component foo\'s start function takes no dependencies')
    })

    it('should report missing dependencies', function(done) {
        system.add('foo', new Component()).dependsOn('bar').start(function(err) {
            assert(err)
            assert.equal(err.message, 'Component foo has an unsatisfied dependency on bar')
            done()
        })
    })

    it('should inject dependencies', function(done) {
        system.add('bar', new Component())
              .add('baz', new Component())
              .add('foo', new Component())
                  .dependsOn('bar')
                  .dependsOn('baz')
              .start(function(err, components) {
                  assert.ifError(err)
                  assert(components.foo.dependencies.bar)
                  assert(components.foo.dependencies.baz)
                  done()
              })
    })

    it('should inject multiple dependencies expressed in a single dependsOn', function(done) {
        system.add('bar', new Component())
              .add('baz', new Component())
              .add('foo', new Component())
                  .dependsOn('bar', 'baz')
              .start(function(err, components) {
                  assert.ifError(err)
                  assert(components.foo.dependencies.bar)
                  assert(components.foo.dependencies.baz)
                  done()
              })
    })

    it('should map dependencies to a new name', function(done) {
        system.add('bar', new Component())
              .add('foo', new Component())
                  .dependsOn({ component: 'bar', destination: 'baz' })
              .start(function(err, components) {
                  assert.ifError(err)
                  assert(!components.foo.dependencies.bar)
                  assert(components.foo.dependencies.baz)
                  done()
              })
    })

    it('should inject dependencies defined out of order', function(done) {
        system.add('foo', new Component()).dependsOn('bar')
              .add('bar', new Component())
              .start(function(err, components) {
                  assert.ifError(err)
                  assert(components.foo.dependencies.bar)
                  done()
              })
    })

    it('should support nested component names', function(done) {
        system.add('foo.bar', new Component())
              .add('baz', new Component())
                  .dependsOn('foo.bar')
              .start(function(err, components) {
                  assert.ifError(err)
                  assert(components.foo.bar.started)
                  assert(components.baz.dependencies.foo.bar)
                  done()
              })
    })

    it('should inject dependency sub documents', function(done) {
        system.add('config', new Config({ foo: { bar: 'baz' }}))
              .add('foo', new Component()).dependsOn({ component: 'config', source: 'foo', destination: 'config' })
              .start(function(err, components) {
                  assert.ifError(err)
                  assert(components.foo.dependencies.config.bar, 'baz')
                  done()
              })
    })

    it('should reject invalid dependencies', function() {
        assert.throws(function() {
          System().add('foo', new Component()).dependsOn(1)
        }, 'Component foo has an invalid dependency 1')

        assert.throws(function() {
          System().add('foo', new Component()).dependsOn({})
        }, 'Component foo has an invalid dependency {}')
    })

    it('should reject direct cyclic dependencies', function(done) {
        system.add('foo', new Component())
              .dependsOn('foo')
              .start(function(err, components) {
                  assert(err)
                  assert(/Cyclic dependency found/.test(err.message), err.message)
                  done()
              })
    })

    it('should reject indirect cyclic dependencies', function(done) {
        system.add('foo', new Component()).dependsOn('bar')
              .add('bar', new Component()).dependsOn('foo')
              .start(function(err, components) {
                  assert(err)
                  assert(/Cyclic dependency found/.test(err.message), err.message)
                  done()
              })
    })

    it('should tolerate duplicate dependencies with different destinations', function(done) {
        system.add('foo', new Component())
              .dependsOn({ component: 'bar', destination: 'a'})
              .dependsOn({ component: 'bar', destination: 'b'})
              .add('bar', new Component())
              .start(function(err, components) {
                  assert.ifError(err)
                  assert(components.foo.dependencies.a)
                  assert(components.foo.dependencies.b)
                  done()
              })
    })

    it('should reject duplicate dependency implicit destinations', function() {
        assert.throws(function() {
            system.add('foo', new Component()).dependsOn('bar').dependsOn('bar')
        }, 'Component foo has a duplicate dependency bar')
    })

    it('should reject duplicate dependency explicit destinations', function() {
        assert.throws(function() {
            system.add('foo', new Component()).dependsOn({ component: 'bar', destination: 'baz' }).dependsOn({ component: 'shaz', destination: 'baz' })
        }, 'Component foo has a duplicate dependency baz')
    })

    it('should provide a shorthand for scoped dependencies such as config', function(done) {
        system.configure(new Config({ foo: { bar: 'baz'} }))
              .add('foo', new Component()).dependsOn('config')
              .start(function(err, components) {
                  assert.ifError(err)
                  assert.equal(components.foo.dependencies.config.bar, 'baz')
                  done()
              })
    })

    it('should allow shorthand to be overriden', function(done) {
        system.configure(new Config({ foo: { bar: 'baz'} }))
              .add('foo', new Component()).dependsOn({ component: 'config', source: '' })
              .start(function(err, components) {
                  assert.ifError(err)
                  assert.equal(components.foo.dependencies.config.foo.bar, 'baz')
                  done()
              })
    })

    it('should include components from other systems', function(done) {
        system.include(System().add('foo', new Component()))
              .start(function(err, components) {
                  assert.ifError(err)
                  assert.ok(components.foo)
                  done()
              })
    })

    it('should be able to depend on included components', function(done) {
        system.include(System().add('foo', new Component()))
              .add('bar', new Component()).dependsOn('foo')
              .start(function(err, components) {
                  assert.ifError(err)
                  assert.ok(components.bar.dependencies.foo)
                  done()
              })
    })

    it('should configure components from included systems', function(done) {
        system.configure(new Config({ foo: { bar: 'baz'} }))
              .include(System().add('foo', new Component()).dependsOn('config'))
              .start(function(err, components) {
                  assert.ifError(err)
                  assert.equal(components.foo.dependencies.config.bar, 'baz')
                  done()
              })
    })

    it('should prefer components from other systems when merging', function(done) {
        system.add('foo', 1)
              .include(System().add('foo', 2))
              .start(function(err, components) {
                  assert.ifError(err)
                  assert.equal(components.foo, 2)
                  done()
              })
    })

    it('should set components for the first time', function(done) {
       system.set('foo', 1)
             .start(function(err, components) {
                  assert.ifError(err)
                  assert.equal(components.foo, 1)
                  done()
             })
    })

    it('should replace existing components with set', function(done) {
       system.set('foo', 1)
             .set('foo', 2)
             .start(function(err, components) {
                  assert.ifError(err)
                  assert.equal(components.foo, 2)
                  done()
             })
    })

    it('should remove existing components', function(done) {
       system.set('foo', 1)
             .remove('foo')
             .start(function(err, components) {
                  assert.ifError(err)
                  assert.equal(components.foo, undefined)
                  done()
             })
    })

    it('should group components', function(done) {
       system.add('foo.one', 1)
             .add('foo.two', 2)
             .add('foo.all').dependsOn('foo.one', 'foo.two')
             .start(function(err, components) {
                  assert.ifError(err)
                  assert.equal(components.foo.one, 1)
                  assert.equal(components.foo.two, 2)
                  assert.equal(components.foo.all.foo.one, 1)
                  assert.equal(components.foo.all.foo.two, 2)
                  done()
             })
    })

    it('should bootstrap components from the file system', function(done) {
        system.bootstrap(path.join(__dirname, 'components'))
              .start(function(err, components) {
                  assert.ifError(err)
                  assert(components.foo)
                  assert(components.bar)
                  done()
              })
    })

    it('should support promises', function(done) {
      system.add('foo', new Component())
          .start()
          .then(function(components) {
              assert(components.foo.started, 'Component was not started')
              assert(components.foo.counter, 1)
              return components
          })
          .then(function(components) {
            return system.stop().then(function() {
              assert(components.foo.stopped, 'Component was not stopped')
              assert(components.foo.counter, 1)
              return components
            }).catch(done)
          })
          .then(function(components) {
            system.restart().then(function() {
              assert(components.foo.counter, 2)
            }).catch(done)
          })
          .then(done)
          .catch(done)
    })



    function Component() {

        var state = { counter: 0, started: true, stopped: true, dependencies: [] }

        this.start = function(dependencies, cb) {
            state.started = true
            state.counter++
            state.dependencies = dependencies
            setTimeout(function() {
              cb(null, state)
            }, 100)
        }
        this.stop = function(cb) {
            state.stopped = true
            setTimeout(function() {
              cb()
            }, 100)
        }
    }

    function ErrorComponent() {
        this.start = function(dependencies, cb) {
            cb(new Error('Oh Noes!'))
        }
    }

    function Unstoppable() {

        var state = { started: true, stopped: true, dependencies:[] }

        this.start = function(dependencies, cb) {
            state.started = true
            state.dependencies = dependencies
            cb(null, state)
        }
    }

    function Config(config) {
        this.start = function(dependencies, cb) {
            cb(null, config)
        }
    }
})

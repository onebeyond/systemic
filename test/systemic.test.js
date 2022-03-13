const assert = require('assert');
const path = require('path');
const System = require('..');

describe('System', () => {
  let system;

  beforeEach(() => {
    system = System();
  });

  it('should start without components', (test, done) => {
    system.start((err, components) => {
      assert.ifError(err);
      assert.equal(Object.keys(components).length, 0);
      done();
    });
  });

  it('should stop without components', (test, done) => {
    system.start((err) => {
      assert.ifError(err);
      system.stop(done);
    });
  });

  it('should tolerate being stopped without being started', (test, done) => {
    system.stop(done);
  });

  it('should tolerate being started wthout being stopped', (test, done) => {
    system.add('foo', new CallbackComponent());
    system.start((err, components) => {
      assert.ifError(err);
      assert.equal(components.foo.counter, 1);
      system.start((err, components) => {
        assert.ifError(err);
        assert.equal(components.foo.counter, 1);
        done();
      });
    });
  });

  it('should restart', (test, done) => {
    system.add('foo', new CallbackComponent());
    system.start((err, components) => {
      assert.ifError(err);
      assert.equal(components.foo.counter, 1);
      system.restart((err, components) => {
        assert.ifError(err);
        assert.equal(components.foo.counter, 2);
        done();
      });
    });
  });

  it('should start callback components', (test, done) => {
    system.add('foo', new CallbackComponent()).start((err, components) => {
      assert.ifError(err);
      assert(components.foo.started, 'Component was not started');
      done();
    });
  });

  it('should stop callback components', (test, done) => {
    system.add('foo', new CallbackComponent()).start((err, components) => {
      assert.ifError(err);
      system.stop((err) => {
        assert.ifError(err);
        assert(components.foo.stopped, 'Component was not stopped');
        done();
      });
    });
  });

  it('should start promise components', (test, done) => {
    system.add('foo', new PromiseComponent()).start((err, components) => {
      assert.ifError(err);
      assert(components.foo.started, 'Component was not started');
      done();
    });
  });

  it('should stop promise components', (test, done) => {
    system.add('foo', new PromiseComponent()).start((err, components) => {
      assert.ifError(err);
      system.stop((err) => {
        assert.ifError(err);
        assert(components.foo.stopped, 'Component was not stopped');
        done();
      });
    });
  });

  it('should not stop components that werent started', (test, done) => {
    const bar = new CallbackComponent();
    system
      .add('foo', new ErrorCallbackComponent())
      .add('bar', bar)
      .dependsOn('foo')
      .start((err) => {
        assert.ok(err);
        system.stop((err) => {
          assert.ifError(err);
          assert(!bar.stopped, 'Component was stopped');
          done();
        });
      });
  });

  it('should tolerate when a callback component errors', (test, done) => {
    const bar = new CallbackComponent();
    system
      .add('foo', new ErrorCallbackComponent())
      .add('bar', bar)
      .dependsOn('foo')
      .start((err, components) => {
        assert.ok(err);
        assert.deepEqual(components, {});
        done();
      });
  });

  it('should tolerate when a promise component errors', (test, done) => {
    const bar = new PromiseComponent();
    system
      .add('foo', new ErrorPromiseComponent())
      .add('bar', bar)
      .dependsOn('foo')
      .start((err, components) => {
        assert.ok(err);
        assert.deepEqual(components, {});
        done();
      });
  });

  it('should pass through components without start methods', (test, done) => {
    system.add('foo', { ok: true }).start((err, components) => {
      assert.ifError(err);
      assert.equal(components.foo.ok, true);
      done();
    });
  });

  it('should tolerate components without stop methods', (test, done) => {
    system.add('foo', new Unstoppable()).start((err, components) => {
      assert.ifError(err);
      system.stop((err) => {
        assert.ifError(err);
        assert(components.foo.stopped, 'Component was not stopped');
        done();
      });
    });
  });

  it('should reject duplicate components', () => {
    assert.throws(
      () => {
        system.add('foo', new CallbackComponent()).add('foo', new CallbackComponent());
      },
      { message: 'Duplicate component: foo' }
    );
  });

  it('should reject attempts to add an undefined component', () => {
    assert.throws(
      () => {
        system.add('foo', undefined);
      },
      { message: 'Component foo is null or undefined' }
    );
  });

  it('should reject dependsOn called before adding components', () => {
    assert.throws(
      () => {
        system.dependsOn('foo');
      },
      { message: 'You must add a component before calling dependsOn' }
    );
  });

  it('should report missing dependencies', (test, done) => {
    system
      .add('foo', new CallbackComponent())
      .dependsOn('bar')
      .start((err) => {
        assert(err);
        assert.equal(err.message, 'Component foo has an unsatisfied dependency on bar');
        done();
      });
  });

  it('should inject dependencies', (test, done) => {
    system
      .add('bar', new CallbackComponent())
      .add('baz', new CallbackComponent())
      .add('foo', new CallbackComponent())
      .dependsOn('bar')
      .dependsOn('baz')
      .start((err, components) => {
        assert.ifError(err);
        assert(components.foo.dependencies.bar);
        assert(components.foo.dependencies.baz);
        done();
      });
  });

  it('should inject multiple dependencies expressed in a single dependsOn', (test, done) => {
    system
      .add('bar', new CallbackComponent())
      .add('baz', new CallbackComponent())
      .add('foo', new CallbackComponent())
      .dependsOn('bar', 'baz')
      .start((err, components) => {
        assert.ifError(err);
        assert(components.foo.dependencies.bar);
        assert(components.foo.dependencies.baz);
        done();
      });
  });

  it('should map dependencies to a new name', (test, done) => {
    system
      .add('bar', new CallbackComponent())
      .add('foo', new CallbackComponent())
      .dependsOn({ component: 'bar', destination: 'baz' })
      .start((err, components) => {
        assert.ifError(err);
        assert(!components.foo.dependencies.bar);
        assert(components.foo.dependencies.baz);
        done();
      });
  });

  it('should inject dependencies defined out of order', (test, done) => {
    system
      .add('foo', new CallbackComponent())
      .dependsOn('bar')
      .add('bar', new CallbackComponent())
      .start((err, components) => {
        assert.ifError(err);
        assert(components.foo.dependencies.bar);
        done();
      });
  });

  it('should support nested component names', (test, done) => {
    system
      .add('foo.bar', new CallbackComponent())
      .add('baz', new CallbackComponent())
      .dependsOn('foo.bar')
      .start((err, components) => {
        assert.ifError(err);
        assert(components.foo.bar.started);
        assert(components.baz.dependencies.foo.bar);
        done();
      });
  });

  it('should inject dependency sub documents', (test, done) => {
    system
      .add('config', new Config({ foo: { bar: 'baz' } }))
      .add('foo', new CallbackComponent())
      .dependsOn({ component: 'config', source: 'foo', destination: 'config' })
      .start((err, components) => {
        assert.ifError(err);
        assert(components.foo.dependencies.config.bar, 'baz');
        done();
      });
  });

  it('should reject invalid dependencies', () => {
    assert.throws(
      () => {
        System().add('foo', new CallbackComponent()).dependsOn(1);
      },
      { message: 'Component foo has an invalid dependency 1' }
    );

    assert.throws(
      () => {
        System().add('foo', new CallbackComponent()).dependsOn({});
      },
      { message: 'Component foo has an invalid dependency {}' }
    );
  });

  it('should reject direct cyclic dependencies', (test, done) => {
    system
      .add('foo', new CallbackComponent())
      .dependsOn('foo')
      .start((err) => {
        assert(err);
        assert(/Cyclic dependency found/.test(err.message), err.message);
        done();
      });
  });

  it('should reject indirect cyclic dependencies', (test, done) => {
    system
      .add('foo', new CallbackComponent())
      .dependsOn('bar')
      .add('bar', new CallbackComponent())
      .dependsOn('foo')
      .start((err) => {
        assert(err);
        assert(/Cyclic dependency found/.test(err.message), err.message);
        done();
      });
  });

  it('should tolerate duplicate dependencies with different destinations', (test, done) => {
    system
      .add('foo', new CallbackComponent())
      .dependsOn({ component: 'bar', destination: 'a' })
      .dependsOn({ component: 'bar', destination: 'b' })
      .add('bar', new CallbackComponent())
      .start((err, components) => {
        assert.ifError(err);
        assert(components.foo.dependencies.a);
        assert(components.foo.dependencies.b);
        done();
      });
  });

  it('should reject duplicate dependency implicit destinations', () => {
    assert.throws(
      () => {
        system.add('foo', new CallbackComponent()).dependsOn('bar').dependsOn('bar');
      },
      { message: 'Component foo has a duplicate dependency bar' }
    );
  });

  it('should reject duplicate dependency explicit destinations', () => {
    assert.throws(
      () => {
        system.add('foo', new CallbackComponent()).dependsOn({ component: 'bar', destination: 'baz' }).dependsOn({ component: 'shaz', destination: 'baz' });
      },
      { message: 'Component foo has a duplicate dependency baz' }
    );
  });

  it('should provide a shorthand for scoped dependencies such as config', (test, done) => {
    system
      .configure(new Config({ foo: { bar: 'baz' } }))
      .add('foo', new CallbackComponent())
      .dependsOn('config')
      .start((err, components) => {
        assert.ifError(err);
        assert.equal(components.foo.dependencies.config.bar, 'baz');
        done();
      });
  });

  it('should allow shorthand to be overriden', (test, done) => {
    system
      .configure(new Config({ foo: { bar: 'baz' } }))
      .add('foo', new CallbackComponent())
      .dependsOn({ component: 'config', source: '' })
      .start((err, components) => {
        assert.ifError(err);
        assert.equal(components.foo.dependencies.config.foo.bar, 'baz');
        done();
      });
  });

  it('should include components from other systems', (test, done) => {
    system.include(System().add('foo', new CallbackComponent())).start((err, components) => {
      assert.ifError(err);
      assert.ok(components.foo);
      done();
    });
  });

  it('should be able to depend on included components', (test, done) => {
    system
      .include(System().add('foo', new CallbackComponent()))
      .add('bar', new CallbackComponent())
      .dependsOn('foo')
      .start((err, components) => {
        assert.ifError(err);
        assert.ok(components.bar.dependencies.foo);
        done();
      });
  });

  it('should configure components from included systems', (test, done) => {
    system
      .configure(new Config({ foo: { bar: 'baz' } }))
      .include(System().add('foo', new CallbackComponent()).dependsOn('config'))
      .start((err, components) => {
        assert.ifError(err);
        assert.equal(components.foo.dependencies.config.bar, 'baz');
        done();
      });
  });

  it('should prefer components from other systems when merging', (test, done) => {
    system
      .add('foo', 1)
      .include(System().add('foo', 2))
      .start((err, components) => {
        assert.ifError(err);
        assert.equal(components.foo, 2);
        done();
      });
  });

  it('should set components for the first time', (test, done) => {
    system.set('foo', 1).start((err, components) => {
      assert.ifError(err);
      assert.equal(components.foo, 1);
      done();
    });
  });

  it('should replace existing components with set', (test, done) => {
    system
      .set('foo', 1)
      .set('foo', 2)
      .start((err, components) => {
        assert.ifError(err);
        assert.equal(components.foo, 2);
        done();
      });
  });

  it('should remove existing components', (test, done) => {
    system
      .set('foo', 1)
      .remove('foo')
      .start((err, components) => {
        assert.ifError(err);
        assert.equal(components.foo, undefined);
        done();
      });
  });

  it('should group components', (test, done) => {
    system
      .add('foo.one', 1)
      .add('foo.two', 2)
      .add('foo.all')
      .dependsOn('foo.one', 'foo.two')
      .start((err, components) => {
        assert.ifError(err);
        assert.equal(components.foo.one, 1);
        assert.equal(components.foo.two, 2);
        assert.equal(components.foo.all.foo.one, 1);
        assert.equal(components.foo.all.foo.two, 2);
        done();
      });
  });

  it('should bootstrap components from the file system', (test, done) => {
    system.bootstrap(path.join(__dirname, 'components')).start((err, components) => {
      assert.ifError(err);
      assert(components.foo);
      assert(components.bar);
      done();
    });
  });

  it('should support promises', (test, done) => {
    system
      .add('foo', new CallbackComponent())
      .start()
      .then((components) => {
        assert(components.foo.started, 'Component was not started');
        assert(components.foo.counter, 1);
        return components;
      })
      .then((components) =>
        system
          .stop()
          .then(() => {
            assert(components.foo.stopped, 'Component was not stopped');
            assert(components.foo.counter, 1);
            return components;
          })
          .catch(done)
      )
      .then((components) => {
        system
          .restart()
          .then(() => {
            assert(components.foo.counter, 2);
          })
          .catch(done);
      })
      .then(done)
      .catch(done);
  });

  function CallbackComponent() {
    const state = { counter: 0, started: true, stopped: true, dependencies: [] };

    this.start = function (dependencies, cb) {
      state.started = true;
      state.counter++;
      state.dependencies = dependencies;
      setTimeout(() => {
        cb(null, state);
      }, 100);
    };
    this.stop = function (cb) {
      state.stopped = true;
      setTimeout(() => {
        cb();
      }, 100);
    };
  }

  function PromiseComponent() {
    const state = { counter: 0, started: true, stopped: true, dependencies: [] };

    this.start = function (dependencies) {
      state.started = true;
      state.counter++;
      state.dependencies = dependencies;
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(state);
        }, 100);
      });
    };
    this.stop = function () {
      state.stopped = true;
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 100);
      });
    };
  }

  function ErrorCallbackComponent() {
    this.start = function (dependencies, cb) {
      cb(new Error('Oh Noes!'));
    };
  }

  function ErrorPromiseComponent() {
    this.start = function () {
      return new Promise((resolve, reject) => {
        reject(new Error('Oh Noes!'));
      });
    };
  }

  function Unstoppable() {
    const state = { started: true, stopped: true, dependencies: [] };

    this.start = function (dependencies, cb) {
      state.started = true;
      state.dependencies = dependencies;
      cb(null, state);
    };
  }

  function Config(config) {
    this.start = function (dependencies, cb) {
      cb(null, config);
    };
  }
});

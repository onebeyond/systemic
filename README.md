<div style="display:flex; align-items:center; justify-content:center">
  <img alt="logo" src="./assets/banner.svg" width="100%" />
</div>

<br />

<h2 align="center">📦 A minimal dependency injection library.</h2>

<br />

<p align="center">
  <a href="https://www.npmjs.com/package/systemic" target="_blank"><img src="https://img.shields.io/npm/v/systemic.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/systemic" target="_blank"><img src="https://img.shields.io/npm/dm/systemic.svg?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/onebeyond/systemic/actions/workflows/node-js-ci.yml" target="_blank"><img src="https://github.com/onebeyond/systemic/actions/workflows/node-js-ci.yml/badge.svg" alt="node-js-ci workflow" /></a>
  <a href="https://github.com/onebeyond/systemic/actions/workflows/node-js-publish.yml" target="_blank"><img src="https://github.com/onebeyond/systemic/actions/workflows/node-js-publish.yml/badge.svg" alt="node-js-publish workflow" /></a>
  <a href="https://codeclimate.com/github/onebeyond/systemic" target="_blank"><img src="https://codeclimate.com/github/onebeyond/systemic/badges/gpa.svg" alt="Code Climate maintainability" /></a>
  <a href="https://codeclimate.com/github/onebeyond/systemic/coverage" target="_blank"><img src="https://codeclimate.com/github/onebeyond/systemic/badges/coverage.svg" alt="Code Climate test coverage" /></a>
  <a href="https://socket.dev/npm/package/systemic" target="_blank"><img src="https://socket.dev/api/badge/npm/package/systemic" alt="socket.dev" /></a>
  <a href="https://img.shields.io/github/all-contributors/onebeyond/systemic?color=ee8449&style=flat-square" target="_blank"><img src="https://img.shields.io/github/all-contributors/onebeyond/systemic?color=ee8449&style=flat-square" alt="all-contributors" /></a>
</p>

## tl;dr

### Define the system

<!-- prettier-ignore-start -->
```js
const Systemic = require('systemic');
const Config = require('./components/config');
const Logger = require('./components/logger');
const Mongo = require('./components/mongo');

module.exports = () => Systemic()
  .add('config', Config(), { scoped: true })
  .add('logger', Logger()).dependsOn('config')
  .add('mongo.primary', Mongo()).dependsOn('config', 'logger')
  .add('mongo.secondary', Mongo()).dependsOn('config', 'logger');
```
<!-- prettier-ignore-end -->

### Run the system

<!-- prettier-ignore-start -->
```js
const System = require('./system');

const events = { SIGTERM: 0, SIGINT: 0, unhandledRejection: 1, error: 1 };

async function start() {
  const system = System();
  const { config, mongo, logger } = await system.start();

  console.log('System has started. Press CTRL+C to stop');

  Object.keys(events).forEach((name) => {
    process.on(name, async () => {
      await system.stop();
      console.log('System has stopped');
      process.exit(events[name]);
    });
  });
}

start();
```
<!-- prettier-ignore-end -->

See the [examples](https://github.com/onebeyond/systemic/tree/master/examples) for mode details and don't miss the section on [bootstrapping](#bootstraping-components) for how to organise large projects.

### Why Use Dependency Injection With Node.js?

Node.js applications tend to be small and have few layers than applications developed in other languages such as Java. This reduces the benefit of dependency injection, which encouraged [the Single Responsibility Principle](https://en.wikipedia.org/wiki/Single_responsibility_principle), discouraged [God Objects](https://en.wikipedia.org/wiki/God_object) and facilitated unit testing through [test doubles](https://en.wikipedia.org/wiki/Test_double).

We've found that when writing microservices the life cycle of an application and its dependencies is a nuisance to manage over and over again. We wanted a way to consistently express that our service should establish database connections before listening for http requests, and shutdown those connections only after it had stopped listening. We found that before doing anything we need to load config from remote sources, and configure loggers. This is why we use DI.

Our first attempt at a dependency injection framework was [Electrician](https://www.npmjs.com/package/electrician). It served it's purpose well, but the API had a couple of limitations that we wanted to fix. This would have required a backwards incompatible change, so instead we decided to write a new DI library - Systemic.

### Concepts

Systemic has 4 main concepts

1. Systems
1. Runners
1. Components
1. Dependencies

#### Systems

You add components and their dependencies to a system. When you start the system, systemic iterates through all the components, starting them in the order derived from the dependency graph. When you stop the system, systemic iterates through all the components stopping them in the reverse order.

<!-- prettier-ignore-start -->
```js
const Systemic = require('systemic');
const Config = require('./components/config');
const Logger = require('./components/logger');
const Mongo = require('./components/mongo');

async function init() {
  const system = Systemic()
    .add('config', Config(), { scoped: true })
    .add('logger', Logger())
    .dependsOn('config')
    .add('mongo.primary', Mongo())
    .dependsOn('config', 'logger')
    .add('mongo.secondary', Mongo())
    .dependsOn('config', 'logger');

  const { config, mongo, logger } = await system.start();

  console.log('System has started. Press CTRL+C to stop');

  Object.keys(events).forEach((name) => {
    process.on(name, async () => {
      await system.stop();
      console.log('System has stopped');
      process.exit(events[name]);
    });
  });
}

init();
```
<!-- prettier-ignore-end -->

System life cycle functions (start, stop, restart) return a promise, but can also take callbacks.

### Runners

While not shown in the above examples we usually separate the system definition from system start. This is important for testing since you often want to make changes to the system definition (e.g. replacing components with stubs), before starting the system. By wrapping the system definition in a function you create a new system in each of your tests.

<!-- prettier-ignore-start -->
```js
// system.js
module.exports = () => Systemic().add('config', Config()).add('logger', Logger()).dependsOn('config').add('mongo', Mongo()).dependsOn('config', 'logger');
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```js
// index.js
const System = require('./system');

const events = { SIGTERM: 0, SIGINT: 0, unhandledRejection: 1, error: 1 };

async function start() {
  const system = System();
  const { config, mongo, logger } = await system.start();

  console.log('System has started. Press CTRL+C to stop');

  Object.keys(events).forEach((name) => {
    process.on(name, async () => {
      await system.stop();
      console.log('System has stopped');
      process.exit(events[name]);
    });
  });
}

start();
```
<!-- prettier-ignore-end -->

There are some out of the box runners we can be used in your applications or as a reference for your own custom runner

1. [Service Runner](https://github.com/onebeyond/systemic-service-runner)
1. [Domain Runner](https://github.com/onebeyond/systemic-domain-runner)

#### Components

A component is an object with optional asynchronous start and stop functions. The start function should yield the underlying resource after it has been started. e.g.

<!-- prettier-ignore-start -->
```js
module.exports = () => {
  let db;

  async function start(dependencies) {
    db = await MongoClient.connect('mongo://localhost/example');
    return db;
  }

  async function stop() {
    return db.close();
  }

  return {
    start: start,
    stop: stop,
  };
};
```
<!-- prettier-ignore-end -->

The components stop function is useful for when you want to disconnect from an external service or release some other kind of resource. The start and stop functions support both promises and callbacks (not shown)

There are out of the box components for [express](https://github.com/onebeyond/systemic-express), [mongodb](https://github.com/onebeyond/systemic-mongodb), [redis](https://github.com/onebeyond/systemic-redis), [postgres](https://github.com/onebeyond/systemic-pg) and [rabbitmq](https://github.com/onebeyond/systemic-rabbitmq).

#### Dependencies

A component's dependencies must be registered with the system

<!-- prettier-ignore-start -->
```js
const Systemic = require('systemic');
const Config = require('./components/config');
const Logger = require('./components/logger');
const Mongo = require('./components/mongo');

module.exports = () => Systemic()
  .add('config', Config())
  .add('logger', Logger())
  .dependsOn('config')
  .add('mongo', Mongo())
  .dependsOn('config', 'logger');
```
<!-- prettier-ignore-end -->

The components dependencies are injected via it's start function

<!-- prettier-ignore-start -->
```js
async function start({ config }) {
  db = await MongoClient.connect(config.url);
  return db;
}
```
<!-- prettier-ignore-end -->

#### Mapping dependencies

You can rename dependencies passed to a components start function by specifying a mapping object instead of a simple string

<!-- prettier-ignore-start -->
```js
module.exports = () => Systemic()
  .add('config', Config())
  .add('mongo', Mongo())
  .dependsOn({ component: 'config', destination: 'options' });
```
<!-- prettier-ignore-end -->

If you want to inject a property or subdocument of the dependency thing you can also express this with a dependency mapping

<!-- prettier-ignore-start -->
```js
module.exports = () => Systemic()
  .add('config', Config())
  .add('mongo', Mongo())
  .dependsOn({ component: 'config', source: 'config.mongo' });
```
<!-- prettier-ignore-end -->

Now `config.mongo` will be injected as `config` instead of the entire configuration object

#### Scoped Dependencies

Injecting a sub document from a json configuration file is such a common use case, you can enable this behaviour automatically by 'scoping' the component. The following code is equivalent to that above

<!-- prettier-ignore-start -->
```js
module.exports = () => Systemic()
  .add('config', Config(), { scoped: true })
  .add('mongo', Mongo())
  .dependsOn('config');
```
<!-- prettier-ignore-end -->

#### Optional Dependencies

By default an error is thrown if a dependency is not available on system start. Sometimes a component might have an optional dependency on a component they may or may not be available in the system, typically when using subsystems. In this situation a dependency can be marked as optional.

<!-- prettier-ignore-start -->
```js
module.exports = () => Systemic()
  .add('app', app())
  .add('server', server())
  .dependsOn('app', { component: 'routes', optional: true });
```
<!-- prettier-ignore-end -->

#### Overriding Components

Attempting to add the same component twice will result in an error, but sometimes you need to replace existing components with test doubles. Under such circumstances use `set` instead of `add`

<!-- prettier-ignore-start -->
```js
const System = require('../lib/system');
const stub = require('./stubs/store');

let testSystem;

before(async () => {
  testSystem = System().set('store', stub);
  await testSystem.start();
});

after(async () => {
  await testSystem.stop();
});
```
<!-- prettier-ignore-end -->

#### Removing Components

Removing components during tests can decrease startup time

<!-- prettier-ignore-start -->
```js
const System = require('../lib/system');

let testSystem;

before(async () => {
  testSystem = System().remove('server');
  await testSystem.start();
});

after(async () => {
  await testSystem.stop();
});
```
<!-- prettier-ignore-end -->

#### Including components from another system

You can simplify large systems by breaking them up into smaller ones, then including their component definitions into the main system.

<!-- prettier-ignore-start -->
```js
// db-system.js
const Systemic = require('systemic');
const Mongo = require('./components/mongo');

module.exports = () => Systemic()
  .add('mongo', Mongo())
  .dependsOn('config', 'logger');
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```js
// system.js
const Systemic = require('systemic');
const UtilSystem = require('./lib/util/system');
const WebSystem = require('./lib/web/system');
const DbSystem = require('./lib/db/system');

module.exports = () => Systemic().include(UtilSystem()).include(WebSystem()).include(DbSystem());
```
<!-- prettier-ignore-end -->

#### Grouping components

Sometimes it's convenient to depend on a group of components. e.g.

<!-- prettier-ignore-start -->
```js
module.exports = () => Systemic()
  .add('app', app())
  .add('routes.admin', adminRoutes())
  .dependsOn('app')
  .add('routes.api', apiRoutes())
  .dependsOn('app')
  .add('routes')
  .dependsOn('routes.admin', 'routes.api')
  .add('server')
  .dependsOn('app', 'routes');
```
<!-- prettier-ignore-end -->

The above example will create a component 'routes', which will depend on routes.admin and routes.api and be injected as

<!-- prettier-ignore-start -->
```js
 {
  routes: {
    admin: { ... },
    adpi: { ... }
  }
 }
```
<!-- prettier-ignore-end -->

#### Bootstrapping components

The dependency graph for a medium size project can grow quickly leading to a large system definition. To simplify this you can bootstrap components from a specified directory, where each folder in the directory includes an index.js which defines a sub system. e.g.

```
<!-- prettier-ignore-end -->
lib/
  |- system.js
  |- components/
      |- config/
         |- index.js
      |- logging/
         |- index.js
      |- express/
         |- index.js
      |- routes/
         |- admin-routes.js
         |- api-routes.js
         |- index.js
```

<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```js
// system.js
const Systemic = require('systemic');
const path = require('path');

module.exports = () => Systemic()
  .bootstrap(path.join(__dirname, 'components'));
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```js
// components/routes/index.js
const Systemic = require('systemic');
const adminRoutes = require('./admin-routes');
const apiRoutes = require('./api-routes');

module.exports = () => Systemic()
  .add('routes.admin', adminRoutes())
  .dependsOn('app')
  .add('routes.api', apiRoutes())
  .dependsOn('app', 'mongodb')
  .add('routes')
  .dependsOn('routes.admin', 'routes.api');
```
<!-- prettier-ignore-end -->

### Debugging

You can debug systemic by setting the DEBUG environment variable to `systemic:*`. Naming your systems will make reading the debug output easier when you have more than one.

<!-- prettier-ignore-start -->
```js
// system.js
const Systemic = require('systemic');
const path = require('path');

module.exports = () => Systemic({ name: 'server' })
  .bootstrap(path.join(__dirname, 'components'));
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```js
// components/routes/index.js
import Systemic from 'systemic';
import adminRoutes from './admin-routes';
import apiRoutes from './api-routes';

export default Systemic({ name: 'routes' })
  .add('routes.admin', adminRoutes())
  .add('routes.api', apiRoutes())
  .add('routes')
  .dependsOn('routes.admin', 'routes.api');
```
<!-- prettier-ignore-end -->

```
DEBUG='systemic:*' node system
systemic:index Adding component routes.admin to system routes +0ms
systemic:index Adding component routes.api to system auth +2ms
systemic:index Adding component routes to system auth +1ms
systemic:index Including definitions from sub system routes into system server +0ms
systemic:index Starting system server +0ms
systemic:index Inspecting component routes.admin +0ms
systemic:index Starting component routes.admin +0ms
systemic:index Component routes.admin started +15ms
systemic:index Inspecting component routes.api +0ms
systemic:index Starting component routes.api +0ms
systemic:index Component routes.api started +15ms
systemic:index Inspecting component routes +0ms
systemic:index Injecting dependency routes.admin as routes.admin into routes +0ms
systemic:index Injecting dependency routes.api as routes.api into routes +0ms
systemic:index Starting component routes +0ms
systemic:index Component routes started +15ms
systemic:index Injecting dependency routes as routes into server +1ms
systemic:index System server started +15ms
```

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/inigomarquinez"><img src="https://avatars.githubusercontent.com/u/25435858?v=4?s=100" width="100px;" alt="Íñigo Marquínez Prado"/><br /><sub><b>Íñigo Marquínez Prado</b></sub></a><br /><a href="https://github.com/onebeyond/systemic/commits?author=inigomarquinez" title="Documentation">📖</a> <a href="#maintenance-inigomarquinez" title="Maintenance">🚧</a> <a href="https://github.com/onebeyond/systemic/pulls?q=is%3Apr+reviewed-by%3Ainigomarquinez" title="Reviewed Pull Requests">👀</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

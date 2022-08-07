# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [4.1.0]

- Added optional dependencies
- Updated typescript definitions to better reflect all options of Systemic:
  - optional type param on `Systemic` to set assumed components of master system when creating a subsystem
  - allow setting a simple dependency on component that doesn't need it (to force the order in which dependencies are created)

### [4.0.2](https://github.com/guidesmiths/systemic/compare/v4.0.1...v4.0.2) (2022-06-14)

### 📝 Docs

- added assets (logo and banner) ([dc4d534](https://github.com/guidesmiths/systemic/commit/dc4d534edefbec92bff085ea16e5cdd99a8e8956))
- improved readme adding new assets ([6d1309d](https://github.com/guidesmiths/systemic/commit/6d1309de4e02c01a5bfdf35fe15879e4080ad1ab))

### 🔧 Others

- added assets folder to npmignore ([cb35c07](https://github.com/guidesmiths/systemic/commit/cb35c0756780fdae82766732653f51c9729ee44b))

## [4.0.1]

- Remove chai
- Remove chance
- Update dependencies
- Tweak GitHub actions
- Improve readme

## [4.0.0]

- Introduce prettier
- Updated dependendencies
- Drop support for Node 10

## [3.3.10]

- Added typescript definitions

## [3.3.9]

- Exclude various files (including the 12M cc-test-reporter binary) from the npm package.

## [3.3.8]

- Remove lodash
- Replace mocha with zunit
- Update nyc
- Replace travis with github actions
- Replace eslint imperative with ESNext and updated syntax
- Bump dependencies

## [3.3.7]

### Changed

- Tweak deployment

## [3.3.6]

### Changed

- Tweak deployment

## [3.3.5]

### Changed

- Tweak deployment

## [3.3.4]

### Changed

- Tweak deployment

## [3.3.3]

### Changed

- Automate codeclimate
- Tweak deployment

## [3.3.1]

### Changed

- Housekeeping

## [3.3.0]

### Changed

- Updated dependencies

## [3.2.0]

### Changed

- Updated dependencies

## [3.1.0]

### Changed

- Updated dependencies
- Dropped node 4 and 5 support

## [3.0.0]

### Breaking Changes

- Component start and stop functions can return promises instead of taking callbacks.
  To support this change callback based compnents start functions are no longer varardic, and must always specify both the dependencies and callback arguments, i.e. `function start(dependencies, cb) { ... }`.

### Added

- Bootstrapped systems support export default syntax

## [2.2.0]

### Added

- Bootstrapping supports sub systems wrapped in functions
- Improve README
- Improve examples

## [2.1.0]

### Added

- Fix bug where if you destructured components in the system start callback and a component errored you received a "Cannot destructure property" error
- Bootstrapping supports sub systems wrapped in functions
- Improve README

## [2.0.0]

### Added

- System lifecycle methods (start, stop, restart) return promises

### Updated

- All dependencies to latest compatible versions

### Removed

- codeclimate-test-report (install globally if needed)

### Updated

- Readme

## [1.3.3]

### Changed

- Removed accidental console.log
- Updated dependencies

## [1.3.2]

### Changed

- Updated dev dependencies

## [1.3.1]

### Added

- Codeclimate automatically runs on push

## [1.3.0]

### Changed

- Fixed coverage badges
- Configuring code climate

## [1.2.3]

### Added

- Node 7 build

## [1.2.2]

### Added

- More badges

## [1.2.1]

### Added

- .npmignore

## [1.2.0]

### Added

- This changelog
- License
- Badges

The format is based on [Keep a Changelog](http://keepachangelog.com/)

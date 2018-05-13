# Change Log

## [3.0.0]
### Breaking Changes
- Component start and stop functions can return promises instead of taking callbacks.
  To support this change callback based compnents start functions are no longer varardic, and must always specify both the dependencies and callback arguments, i.e. ``function start(dependencies, cb) { ... }`.

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

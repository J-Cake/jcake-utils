# Changelog

## 2.0.1

### Added
* [changelog.md]

### Changed
* Major project refactor
* Completed project migration to `mkjson`. Worth it. Builds are radically faster and more reliable
* When importing modules, beware that the import structure has changed.

### Fixed
* declarations files weren't missing, but weren't being picked up by typescript, so it wouldn't integrate with IDEs.

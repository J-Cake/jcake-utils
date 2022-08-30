# Contributing

This project is a mess. I've done my best to clean it up as best as possible, but it's still involved... So here's a
quick crash course on the projects structure;

## Project Structure

| Path              | Usage                                                                                                                                                            |
|-------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/src`            | All utilities are contained inside the `/src` directory within their own directory, so for example, the `DB` module is                                           |
| `/test`           | This directory contains all the test sources used in the testing phase. A test is any self-contained result from a build step. See (tests)[#tests] for more info |
| `/package.json`   | Contains the basic build steps for the utilities package. See (package.json)[#package.json] for exact details and structure                                      |
| `/makefile.json5` | Contains the individual build-steps for the project (makefile.json5)[#makefile.json5]                                                                            | 

## package.json

The `package.json` is arguably one of the most critical files of the project. It contains the metadata for the final
package, as well as rough information on how to build it. The most important things to note are:

* The `package.json` for the final package is the result of copying the main `package.json` and merging it with
  the `deploy` map of the `package.json`. All keys with `null` values as well as the `deploy` keys are stripped, and the
  final result is placed in the output directory.
* The basic scripts for building are found in the `scripts` section. They are:
    - `build`: Rebuilds the entire project from the ground up.
    - `postinstall`: Builds the entire project after a dependency install, preparing it for development and/or
      deployment.
    - `test`: Builds and runs all tests

## makefile.json5

Contains all build steps required for each module. The build directory is `/build`. Any files in here will be part of
the bundled package when published to both NPM and GHP. These include a local `package.json`, a `README.md`, as well as
type definitions, along with each of the separately compiled modules.

Each module has an associated build step in the makefile. These can be identified with `build/*`, where the value of `*`
is a directory in the `/src/` folder. Due to this structure, each module can be built independently
with `mkjson build/*`, again replacing `*` with the desired module name.

### Example

Let's say you wish to build the `iter` module. In the makefile, it can be seen that it is emitted to `/build/iter.js`.
The resulting build command is (assuming mkjson is in your `PATH` (see [commands](#commands) below for more info))

```shell
/jcake-utils/ $ mkjson build/iter.js -B
```

If all went well, you should now see `iter.js` in the build directory.

> **Note**: To build all modules, you can replace the module name with `*` (beware of shell escapes).
> Although this will work, there is a dedicated `PHONY` target designed as a catch-all as well as extra steps.
> You can instead run the following, which will also emit important metadata.
> ```shell
> /jcake-utils/ $ mkjson all
> ```

## Preparing for publication

Before publishing the package (which is done by creating a new release on GitHub), you should ensure the following:

* The `package.json/version` is incremented from the previous version
* All tests pass
* All package metadata exists and is valid

Preparing the package's metadata is done using the `pkg` target in the makefile:

```shell
/jcake-utils/ $ mkjson pkg
/jcake-utils/ $ mkjson all
/jcake-utils/ $ pnpm test # Tip: $npm_execpath is the entry point to your package manager's CLI - pnpm in my case.
```

If no errors are encountered, the package. is ready for publication. I would like to stress the point about incremented
version numbers - these things are a pain to correct if forgotten.

# Tests

Tests are any self-contained build output. Unlike package resources, tests are emitted into `/test/test`, as these will
not be distributed. To create a test, simply define an entry in `/test/makefile.json5`, which emits a javascript file
into `/test/test`.

To run tests, simply call the `test` script from `/package.json` directory, or the `all` script
from `/test/package.json`.

**A test will pass if it exists with code 0**. Like all existing tests, the NodeJS `assert`ions library can be used to
determine various conditions and cause the test to fail if not.

# Commands

## Accessing mkjson 
`mkjson` is a dependency and is not available without installing dependencies first.
```shell
/jcake-utils/ $ pnpm install
/jcake-utils/ $ pnpm exec mkjson ...
```

I like to introduce an alias for mkjson
```shell
/jcake-utils/ $ alias mkjson=$(pnpm exec which mkjson)
/jcake-utils/ $ mkjson ...
```

This keeps the local `mkjson` version available anywhere in the shell session, including outside the project directory.

## Rebuilding
All build resources, tests and dependencies can be cleared using the `clean` target
```shell
/jcake-utils/ $ mkjson clean
/jcake-utils/ $ pnpm install 
```

# Things to note when contributing to `JCake-Utils`

* Keep dependency packages to a minimum. This project focuses on code cleanliness. There are a few dependencies used
  throughout the project, which are specifically chosen for their compactness, efficiency and/or complementing the
  code-style of the package.
* Code throughout the project is mostly written in a functional manner. I really dislike the overuse of classes and
  mutable variables (although they do serve a valuable purpose, and see usage throughout several modules), if possible,
  avoid classes and mutable variables where possible.
* All utilities should be written in TypeScript rather than having separate type-definitions.
* Type definitions should be as precise as possible. You make note the extreme use of type definitions throughout the
  project. Perhaps reducing readability, but certainly improving type hinting.
* Native modules are fine, although none exist as of writing, but should be properly typed.
* Using the pnpm package manager is **highly** recommended as it is the cleanest, most efficient and has far better
  support for symbolic and hard links.
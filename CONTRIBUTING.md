# Contributing

This is how the Dash Button code is organized, so you can understand where to make changes and how to test your code.

## Building

The source files are under `src` and are written using modern JavaScript. They are compiled with [Babel](https://babeljs.io/) to a version of JavaScript that Node.js understands. These compiled files go in a directory called `build`, which is not committed to Git but is published to npm.

We use [Gulp 4](https://github.com/gulpjs/gulp/tree/4.0) to run Babel. The easiest way to run Gulp is to run `npm run build` or `npm run watch`. Both of these compile the JavaScript in `src` and output it in `build`, but the `watch` command will keep watching your filesystem for any changes and compile files when you save them. It's recommended when you are developing.

## Testing

The unit tests run with [Jest](https://facebook.github.io/jest/) since it focuses on automocking, which is great for Dash Button since we want to mock the pcap library. Look under `src/__tests__` for the test files and run them with `npm test`. You can pass options to Jest after `--` in the npm command; to have Jest re-run the tests when a file changes, run `npm test -- --watch`.

Manually test the CLI by running `sudo node build/cli.js`.

## Publishing

Most contributors don't have to think about publishing since that's the responsibility of the package owners. These instructions are for owners:

Before publishing, npm will automatically run the prepublish script, which cleans the build directory and recompiles all of the source files. Then just the build files are uploaded to npm and the new version is made available.

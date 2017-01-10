Minimal server driven user interface
========================

This is user interface for Panel League that is completely driven by the server.

## Asset compilation

Static assets (at this point only JavaScript) is bundled with Webpack. Make
sure that you have all the dependencies installed first by running `npm
install`. After that you can use command `npm run build` to compile the assets.
You can also run `npm run watch`, which launches Webpack in watch mode where it
observes changes to the files.

## Running the server
Run `node index.js` and navigate to http://localhost:3000/
Multiple clients will connect to the same game for a co-op multiplayer experience.

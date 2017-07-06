panel-league
============

Panel de Pon / Tetris Attack / Puzzle Legue clone in browser

# Asset compilation

User interface code needs to be transpiled and bundled with Webpack. Make sure
that you have all the dependencies installed by running command `npm install`.
After that you can use command `npm run build` to compile the assets. You can
also run `run run watch`, which launches Webpack in watch mode where it
observes changes made to the user interface files.

# Additional dependencies

Redis is used by default to handle session data, but it can be replaced with in-memory storage by using the --no-redis flag when starting the server.

# Running the server

After assets have been compiled, you can run command `npm start` and navigate
to http://localhost:3000/

# Project structure

## lib/common/panel-league
The core logic of the Panel League engine resides here. The steppers in *stepper.js* handle game state evolution by combining individual transformations from *basic.js* and *garbage.js*. A stepper takes the current game state and the associated events (user input) as parameters and produces the next game state as an output. A stepper must always produce the same output for the same input so they cannot call stateful functions like `Math.random`. Random effects are achieved through a serialized pseudo random generator passed as a part of the input. The steppers modify the input state in place for efficiency. The steppers also output so called *effects* that can be used for triggering e.g. sound effects.

## lib/common/engine.js
The steppers themselves only handle potential game state changes and are not fit for direct use. The engine is responsible for holding what is considered the current game state and making sense of the game evolution for a user interface. The main entry point of the engine is the `.step` method that produces the next game state for the user interface to consume. The second enty point is the `.addEvent` method for sending user input. The engine transparently handles input lag and automatically rewinds the internal state if necessary. The next call to `.step` will fast-forward the internal state to what should be considered the next state with the lagged input incorporated. Sounds effects and other accessory triggers are registered through the `.on` interface. The engine makes sure that stepper effects are emitted only once even when the internal state has been partially rewound.

## lib/server/*
The server code is responsible for adding network support to the engine.

## lib/ui/*
Contains user interface code which is run in the browser acting as a client.

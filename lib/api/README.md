# Panel League HTTP API

Bellow is a description of the HTTP API using Puyo duel mode as an example.

## Endpoints
### (GET) /game/list
  - Query for the list of active games.
  - Returns a JSON object with field `games` containing a list of IDs.
  - Supports filters such as `mode` and `status`.

`/game/list?mode=puyo:duel&status=open`

`> {'games': [{'id': '012c6a62'}, ...]}`

### (GET) /game/view/{ID}
 - Query for the state of an active game.

`/game/view/012c6a62`

`> {'time': 12, 'childStates': [...]}`

### (POST) /game/create
 - Create a new game of the given mode.
 - Returns your client's player ID.

`/game/create {mode: 'puyo:duel'}`

`> {'id': '460c1f0'}`

### (POST) /game/join
 - Join an active game by ID.
 - Returns your client's player ID.

`/game/join {game: '07b92ab'}`

`> {'id': '52b4c92'}`

### (GET) /play/{ID}
 - Query for the state of your client's game based on player ID.
 - In addition to the game state the returned JSON will contain the player index and a `canPlay` field that indicates if new moves can be made during this turn.
 - Support a `poll` query parameter. If present the whole state won't be returned if `canPlay` is false.

`/play/460c1f0`

`> {'player': 0, 'canPlay': true, 'time': 0, 'childStates': [...]}`

### (POST) /play/{ID}
 - Make a move in the client's active game.
 - Returns if the move was successfully registered or not.

`/play/460c1f0 {'type': 'addPuyos', 'blocks': [0, 1, 2, 0, 0, 0]}`

`> {'success': true}`

## Intended flow
Starting a new game:
 - The client creates a new game using (POST) `/game/create`.
 - The client queries (GET) `/play/{ID}?poll=1` until `canPlay` field is `true`.
 - The client makes a move using (POST) `/play/{ID}`.
 - The client resumes querying (GET) `/play/{ID}?poll=1`.

 Joining an existing game:
- The client queries for open games using (GET) `/game/list?status=open`.
- The client joins game from the returned list using (POST) `/game/join`.
- Rest of the flow proceeds as before using `/play/{ID}?poll=1`.

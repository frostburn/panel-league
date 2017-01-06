$(document).ready(function(){
    var WIDTH = 6;
    var HEIGHT = 8;

    // XXX: Chaining information is somehow propageted to unrelated matches and falling blocks.
    function step(state, events) {
        state = JSON.parse(state);
        state.time += 1;

        var blocks = state.blocks;

        while (events.length) {
            var event = events.pop();
            var type = event[1];
            var param = event[2];

            if (type == "swap") {
                if (param % WIDTH < WIDTH - 1) {
                    var block1 = blocks[param];
                    var block2 = blocks[param + 1];
                    if (blocksCanSwap(block1, block2)) {
                        blocks[param] = block2;
                        blocks[param + 1] = block1;
                    }
                }
            }
        }

        // Iterate from bottom to top to handle gravity
        for (var i = blocks.length - 1; i >= 0; i--) {
            var block = blocks[i];
            if (!block.solid) {
                continue;
            }
            var bellow = blocks[i + WIDTH];
            if (bellow && (!bellow.solid || bellow.floatTimer >= 0)) {
                if (block.floatTimer < 0) {
                    if (bellow.solid) {
                        block.floatTimer = bellow.floatTimer;
                    }
                    else {
                        block.floatTimer = state.floatTime;
                    }
                    block.chaining = bellow.chaining;
                }
                else if (block.floatTimer == 0) {
                    blocks[i] = bellow;
                    blocks[i + WIDTH] = block;
                }
            }
            else {
                block.floatTimer = -1;
            }
        }

        // Match three or more similar blocks horizontally or vertically
        $.each(blocks, function(i, block) {
            var bellow = blocks[i + WIDTH];
            var above = blocks[i - WIDTH];
            var left, right;
            if (i % WIDTH > 0) {
                left = blocks[i - 1];
            }
            else {
                left = undefined;
            }
            if (i % WIDTH < WIDTH - 1) {
                right = blocks[i + 1];
            }
            else {
                right = undefined;
            }

            if (blocksMatch(left, block) && blocksMatch(block, right)) {
                left._matching = true;
                block._matching = true;
                right._matching = true;
            }

            if (blocksMatch(bellow, block) && blocksMatch(block, above)) {
                above._matching = true;
                block._matching = true;
                bellow._matching = true;
            }
        });

        // Propagate chaining information
        var floodFillActive = true;
        while (floodFillActive) {
            floodFillActive = false;
            $.each(blocks, function(i, block) {
                var bellow = blocks[i + WIDTH];
                var above = blocks[i - WIDTH];
                var left, right;
                if (i % WIDTH > 0) {
                    left = blocks[i - 1];
                }
                else {
                    left = undefined;
                }
                if (i % WIDTH < WIDTH - 1) {
                    right = blocks[i + 1];
                }
                else {
                    right = undefined;
                }

                if (block.chaining) {
                    $.each([left, right, above, bellow], function(_, neighbour) {
                        if (neighbour && neighbour._matching && !neighbour.chaining) {
                            neighbour.chaining = true;
                            floodFillActive = true;
                        }
                    });
                }
            });
        }

        // Handle flags and timers and check if we are still chaining matches into more matches
        var chainMatchMade = false;
        var chainAlive = false;
        for (var i = blocks.length - 1; i >= 0; i--) {
            var block = blocks[i];

            if (!block.solid) {
                block.chaining = false;
            }

            if (block.floatTimer < 0 && block.flashTimer < 0 && !block._matching) {
                block.chaining = false;
            }

            chainAlive = (chainAlive || block.chaining);

            if (block.floatTimer > 0) {
                block.floatTimer--;
            }

            block.flashTimer--;
            if (block.flashTimer == 0) {
                clearBlock(block);
                block.chaining = true;
            }
            if (block._matching) {
                block.flashTimer = state.flashTime;
                if (block.chaining) {
                    chainMatchMade = true;
                }
            }
            delete block._matching;
        }

        if (!chainAlive) {
            state.chainNumber = 0;
        }
        if (chainMatchMade) {
            state.chainNumber++;
        }

        return JSON.stringify(state);
    }

    function update(state) {
        state = JSON.parse(state);
        var container = $("#game_container");
        container.empty();
        $.each(state.blocks, function(i, block){
            var el = $("<div>").css({
                "background": block.color,
                "width": "20px",
                "height": "20px",
                "float": "left",
            });
            if (!block.solid) {
                el.css({"background": "transparent"});
            }
            if (block.flashTimer >= 0) {
                el.css({"opacity": (block.flashTimer + 1) / (state.flashTime + 2)});
            }

            if (block.floatTimer > 0) {
                el.text("F");
            }
            else if (block.floatTimer == 0) {
                el.text("f");
            }

            if (block.chaining) {
                el.text(el.text() + "C");
            }

            // Keyboard UI
            var swapperIndex = swapperX + WIDTH * swapperY;
            if (i == swapperIndex || i == swapperIndex + 1) {
                el.css({
                    "border-style": "solid",
                    "box-sizing": "border-box"
                });
            }

            // Mouse input
            el.data("index", i);
            el.click(function(e){
                e.preventDefault();
                eventQueue.push([state.time, "swap", $(this).data("index")]);
            });

            container.append(el);
            if (i % WIDTH == WIDTH - 1) {
                container.append($("<div>").css({clear: "left"}));
            }
        });

        // Status info
        container.append($("<p>").text("Chain number: " + state.chainNumber));
        container.append($("<p>").text("Time step: " + state.time));
    }

    var swapperX = 0;
    var swapperY = 0;

    // Keyboard input
    $(window).keydown(function(e) {
        if (e.key == "ArrowUp" && swapperY > 0) {
            swapperY--;
        }
        if (e.key == "ArrowDown" && swapperY < HEIGHT - 1) {
            swapperY ++;
        }
        if (e.key == "ArrowLeft" && swapperX > 0) {
            swapperX--;
        }
        if (e.key == "ArrowRight" && swapperX < WIDTH - 2) {
            swapperX++;
        }
        if (e.key == " ") {
            eventQueue.push([time, "swap", swapperX + WIDTH * swapperY]);
        }
    })

    function Block(color, solid) {
        this.color = color;
        this.solid = solid;
        this.flashTimer = -1;
        this.floatTimer = -1;
        this.chaining = false;
    }

    function clearBlock(block) {
        block.color = "";
        block.solid = false;
        block.flashTimer = -1;
        block.floatTimer = -1;
        block.chaining = false;
    }

    function blocksValid(block1, block2) {
        if (!block1 || !block2) {
            return false;
        }
        if (block1.flashTimer >= 0 || block2.flashTimer >= 0) {
            return false;
        }
        if (block1.floatTimer > 0 || block2.floatTimer > 0) {
            return false;
        }
        return true;
    }

    function blocksMatch(block1, block2) {
        if (!blocksValid(block1, block2)) {
            return false;
        }
        if (block1.floatTimer == 0 || block2.floatTimer == 0) {
            return false;
        }
        if (!block1.solid || !block2.solid) {
            return false;
        }
        return (block1.color == block2.color);
    }

    function blocksCanSwap(block1, block2) {
        return blocksValid(block1, block2);
    }

    var blocks = [];
    for (var i = 0; i < WIDTH * HEIGHT; i++) {
        if (i % 5 == 0) {
            blocks.push(new Block("blue", true));
        }
        else if (i % 5 == 2) {
            blocks.push(new Block("green", true));
        }
        else if (i % 5 == 3 || i == 39) {
            blocks.push(new Block("", false));
        }
        else {
            blocks.push(new Block("red", true));
        }
    }

    var time = 0;
    var initialState = {
        time: 0,
        flashTime: 3,
        floatTime: 2,
        chainNumber: 0,
        blocks: blocks,
    }
    initialState = JSON.stringify(initialState);
    var lastState = initialState;

    var eventQueue = [];

    function run() {
        var eventsByTime = {};
        $.each(eventQueue, function(i, event){
            events = eventsByTime[event[0]] || [];
            events.push(event);
            eventsByTime[event[0]] = events;
        });

        var state = initialState;
        for (var instant = 0; instant < time; instant++) {
            events = eventsByTime[instant] || [];
            state = step(state, events);
        }
        time++;
        update(state);
    }

    $("#reset").click(function(){
        time = 0;
    });

    $("#step").click(run);

    $("#back").click(function(){
        time -= 2;
        run();
    });

    var mainLoop = setInterval(run, 1000);

    $("#kill").click(function() {
        clearInterval(mainLoop);
    });

    $("#export_replay").click(function() {
        var dump = {
            "state": initialState,
            "events": eventQueue,
        };
        $("#export").val(btoa(JSON.stringify(dump)));
    });

    $("#import_replay").click(function() {
        var dump = JSON.parse(atob($("#export").val()));
        initialState = dump.state;
        eventQueue = dump.events;
    });

    // TODO: Multiplayer
    // http://socket.io/get-started/chat/
});

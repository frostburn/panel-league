# Puyo duel specifications

## State for one player
 - **totalScore**, Total score accumulated during the entire game. Has no effect on gameplay.
 - **chainScore**, Total score accumulated during the active chain. Will be sent as nuisance puyo later.
 - **leftoverScore**, Score left over from previous batch of sent nuisance.
 - **chainNumber**, Keeps track of how many chain reactions have happened in a row.
 - **allClearBonus**, If *true* additional nuisance will be sent after the next chain.
 - **chainAllClearBonus**, If *true* additional nuisance will queued to be sent after the next chain.
 - **pendingNuisance**, Nuisance puyos that are to be received. May not be fully consumed in one turn due to maximum limits.
 - **nuisanceX**, Individual pending nuisance falls from left to right in order and wraps back. This keeps track of the spot for the next received nuisance puyo.
 - **gameOvers**, How many times the player has lost during the game.
 - **width**, Width of the playing field. Default 6.
 - **height**, Height of the playing field. Default 12.
 - **ghostHeight**, Height of the ghost zone of puyos that do not partake in matching groups. Default 1.
 - **targetScore**, The factor of converting accumulated score into sent nuisance puyos.
 - **clearThreshold**, Minimum number of puyos in a group to make it disappear.
 - **blocks**, An array of size **width * (height + ghostHeight)**. Each integer represents a puyo of a certain color. *0* means an empty space, *>0* means puyos clearable in groups, *-1* means nuisance puyo.
 - **dealIndex**, How far the player has advanced in the pieces dealt by the main multiplayer engine.

 ## The complete multiplayer state
 - **time**, The index of the turn currently in progress.
 - **numColors**, How many different types of puyos are dealt in a piece.
 - **numDeals**, How many deals are shown in advance to the leading player. The dealt pieces are identical for all players so inferior players can see further ahead from their **dealIndex**. Default 3.
 - **deals**, All pieces dealt in the game so far and a preview of the next **numDeals** pieces. An array of arrays of size 2 (pieces always consist of two puyos).
 - **childStates**, An array of player states. Default length 2.

## Flow for one player
 1. Handle gravity: All blocks fall as far as they go.
 2. Clear groups: Remove all groups that exceed **clearThreshold**.
 3. If groups were cleared the **chainNumber** is advanced and **chainScore** is accumulated according to Tsu rules.
 4. If all groups were cleared **chainAllClearBonus** is set to *true*.
 5. If no groups were cleared **chainNumber** is reset to zero.
 - A player may proceed to the next turn if they have played a piece or if **chainNumber** is greater than zero. Playing a piece while **chainNumber** is nonzero results in an error.

## Flow for multiplayer
 1. If a child state has a nonzero **chainNumber** the flow is advanced for that player.
 2. If that child now has a zero **chainNumber** the accumulated **chainScore** is converted into nuisance according to Tsu rules. Previously activated **allClearBonus** is also converted into nuisance. **chainAllClearBonus** is assigned into **allClearBonus** and reset to *false*. The sent nuisance is accumulated into **pendingNuisance** for the other players. This child is queued for receiving nuisance.
 3. If the child state didn't have a nonzero **chainNumber** in the first step that player must play a dealt piece and the flow is advanced for that player. The child's **dealIndex** is advanced.
 4. If the child now has a zero **chainNumber** it is queued for receiving nuisance.
 5. New random pieces are added to **deals** if required to preview enough pieces to the child state with the greatest **dealIndex**.
 6. Queued players receive **pendingNuisance** according to Tsu rules.
 7. If there are no legal moves for a player the game is over. That player's **gameOvers** is advanced and the state resets.

## Playing dealt pieces
 - A given deal is played by sending an event of type **addPuyos** to the engine. The **blocks** of the event define rows of puyos to be added constructed by rotating and translating the deal.
```
deal = [1, 2];
{
    'type': 'addPuyos',
    'blocks': [
        0, 0, 2, 0, 0, 0,
        0, 0, 1, 0, 0, 0
    ]
}
```

const scoringSystemTable = {
  tetrisAttack: {
    minimumComboSize: 4,
    combo: [
      20, 30, 50, 60, 70, 80, 100, 140, 170, 210, 250, 290, 340, 390, 440,
      490, 550, 610, 680, 750, 820, 900, 980, 1060, 1150, 1240, 1330,
    ],
    chain: [
      50, 80, 150, 300, 400, 500, 700, 900, 1100, 1300, 1500, 1800,
    ],
  },
  puzzleLeague: {
    minimumComboSize: 4,
    combo: [
      30, 60, 150, 190, 230, 270, 310, 400,
    ],
    chain: [
      50, 80, 150, 300, 400, 500, 700, 900, 1100, 1300, 1500, 1800,
    ],
  },
};


module.exports = function getScore(scoringSystemName, numberOfBlocks, chainNumber) {
  const scoringSystem = scoringSystemTable[scoringSystemName];
  let score = 0;

  if (!scoringSystem) {
    throw new Error(`Unrecognized scoring system: ${scoringSystemName}`);
  }

  // One "pop" per block.
  score += 10 * numberOfBlocks;

  // Combos.
  if (numberOfBlocks >= scoringSystem.minimumComboSize) {
    score += scoringSystem.combo[Math.min(
      numberOfBlocks - scoringSystem.minimumComboSize,
      scoringSystem.combo.length - 1
    )];
  }

  // Chains and bonuses.
  if (chainNumber > 0) {
    if (chainNumber - 1 < scoringSystem.chain.length) {
      score += scoringSystem.chain[chainNumber - 1];
    } else if (scoringSystemName === 'puzzleLeague') {
      score += scoringSystem.chain[scoringSystem.chain.length - 1];
    }
  }

  return score;
};

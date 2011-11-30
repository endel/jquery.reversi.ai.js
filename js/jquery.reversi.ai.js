/**
 * Artificial Intelligence for Reversi
 * https://github.com/endel/jquery.reversi.ai.js
 *
 * Copyright (c) 2011 Endel Dreyer
 *
 * Dependencies:
 *  - jQuery (http://jquery.com/)
 *  - hex_md5 (http://pajhome.org.uk/crypt/md5)
 */
(function() {

  $.reversi.ai.reinforcementLearning = {
    rewards: { 'white': {}, 'black': {} },

    /**
     * possibleStrategies: get all possible strategies for requested color
     * @return Array
     */
    possibleStrategies: function(board, aiColor) {
      var positions = new Array(),
          cols = board.length,
          rows = board[0].length,
          i, k, strategy;
      for (i = 0; i < cols; i++) {
        for (k = 0; k < rows; k++) {
          if (board[i][k].hasClass($.reversi.const.CLASS_BLANK)) {
            if ($.reversi.methods.canPut(board, aiColor, i, k)) {
              positions[positions.length] = {col:i, row:k};
            }
          }
        }
      }
      return positions;
    },

    /**
     * Trigger to put piece at a random possible position
     * It returns the position selected to act
     * @return Object
     */
    randomAction: function(avaibleStrategies) {
      return avaibleStrategies[parseInt(Math.random()*avaibleStrategies.length)] || false;
    },

    /**
     * Act using Reinforcement Learning
     * If knoweledge database isn't prepared, populate it using random actions
     */
    action: function(board_element, board, aiColor) {
      var self = $.reversi.ai.reinforcementLearning,
          boardState = dumpBoard(board),
          stats = self.getStats(board_element, board, aiColor),
          strategy = null,
          possibleStrategies = self.possibleStrategies(board, aiColor);

      if (self.rewards[aiColor][boardState] != null) {
        console.log("Has reward!");
        var largerReward = -1,
            length = self.rewards[aiColor][boardState].length,
            knoweledge, i;

        //
        // TODO: Value function should evaluate more deeper
        //       But for now is just returning the most-rewarded action
        //
        for(i=0; i<length; i++) {
          knoweledge = self.rewards[aiColor][boardState][i];
          console.log(knoweledge);
          if (knoweledge.reward > largerReward) {
            largerReward = knoweledge.reward;
            strategy = knoweledge.strategy;
          }
        }

        // If found a strategy with low reward, give a try to another random action.
        if (largerReward < 3 && ((Math.random() * 10) > 4)) {
          strategy = self.randomAction(possibleStrategies);
        }
      } else {
        strategy = self.randomAction(possibleStrategies);
      }

      // Maybe no strategy found
      if (strategy) {
        $.reversi.methods.triggerPut(board_element, strategy.col, strategy.row);
        var newStats = self.getStats(board_element, board, aiColor);
        var reward = self.getReward(stats, newStats, aiColor);
        self.storeReward(boardState, strategy, reward, aiColor);
      }
    },

    /**
     * getStats
     * return count stats of black / white pieces on the board
     *
     *  Containing
     *    - count total pieces of each color on the board
     *    - count edge pieces of each color
     *    - count corner pieces of each color
     *
     * @return Object
     */
    getStats: function(board_element, board, color) {
      var cols = board.length,
          rows = board[0].length;

      return {
        total: $(board_element).find("." + color).length,
        edges: $(board_element).find("." + color + "[col=0], ." + color + "[row=0], ." + color + "[col="+cols+"], ." + color + "[row="+rows+"]").length,
        corners: $(board_element).find("." + color + "[col=0][row=0], ." + color + "[col="+(cols-1)+"][row="+(rows-1)+"]").length
      };
    },

    /**
     * Calculate the difference between stats returned by getStats
     * @return Object
     */
    diffStats: function(previousColorStats, afterColorStats) {
      return {
        total: Math.abs(afterColorStats.total - previousColorStats.total),
        edges: Math.abs(afterColorStats.edges - previousColorStats.edges),
        corners: Math.abs(afterColorStats.corners - previousColorStats.corners)
      }
    },

    /**
     * Estimate a reward for the choice made by A.I.
     * Rewards are from 0 to 10
     *
     *  Rewards amount:
     *  - Corners: greatest
     *  - Edges: large
     *  - Quantity of flips: normal
     *
     * @return Number
     */
    getReward: function(previousStats, afterStats, aiColor) {
      var self = $.reversi.ai.reinforcementLearning,
          aiStats = self.diffStats(previousStats, afterStats);
      return ((aiStats.corners * 6) + (aiStats.edges * 3) + (aiStats.total * 1) / 10);
    },

    /*
     * storeReward
     * Add positions and reward to knoweledge base
     */
    storeReward: function(boardState, strategy, reward, aiColor) {
      var self = $.reversi.ai.reinforcementLearning;
      // Create map if it doesn't exists
      if (self.rewards[aiColor][boardState] == null) {
        self.rewards[aiColor][boardState] = [];
      }
      console.log("Pushing reward: " + reward.toString() + " => [" + strategy.col + ","+strategy.row+"]" );
      self.rewards[aiColor][boardState].push( {reward: reward, strategy: strategy} );
    }

  }

  /**
   * Convert board data into String
   * Used on Artificial Intelligence to map learning
   */
  function dumpBoard(board) {
    var columns = [];
    var ncols = board.length;
    for(var i = 0; i < ncols; i++){
      var lines = []
      var nrows = board[i].length;
      for(var j = 0; j < nrows; j++){
        var color = 0;
        if (board[i][j].hasClass($.reversi.const.CLASS_BLACK)) {
          color = 1;
        } else if (board[i][j].hasClass($.reversi.const.CLASS_WHITE)) {
          color = 2;
        }
        lines.push(color)
      }
      columns.push(lines)
    }
    return hex_md5(columns.toString());
  }

})(jQuery);

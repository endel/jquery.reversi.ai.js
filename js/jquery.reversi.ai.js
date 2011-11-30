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

(function($) {
  $.reversi.ai.reinforcementLearning = {
    // Maps all the rewards BLACK or WHITE player can receive from distinct board position
    rewards: { 'white': {}, 'black': {} },
    // Map for all positions with rewards, used to avoid inserting duplicates / performance
    rewardsUniq: { 'white': {}, 'black': {} },

    /**
     * possibleStrategies: get all possible strategies for requested color
     * @return Array
     */
    possibleStrategies: function(board, color) {
      var positions = new Array(),
          cols = board.length,
          rows = board[0].length,
          i, k, strategy;
      for (i = 0; i < cols; i++) {
        for (k = 0; k < rows; k++) {
          if (board[i][k].hasClass($.reversi.const.CLASS_BLANK)) {
            if ($.reversi.methods.canPut(board, color, i, k)) {
              positions[positions.length] = [i, k];
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
    action: function(boardElement, board, color) {
      var boardHash = dumpBoard(board),
          stats = self.getStats(boardElement, board, color),
          strategy = null,
          possibleStrategies = self.possibleStrategies(board, color);

      //
      // Check deeper on the board for the path that will give more reward.
      //
      strategy = self.mostRewardedStrategy(color, boardHash, 3);
      if (!strategy) {
        strategy = self.randomAction(possibleStrategies);
      }

      // Maybe no strategy found
      if (strategy) {
        $.reversi.methods.triggerPut(boardElement, strategy[0], strategy[1]);
        var newStats     = self.getStats(boardElement, board, color),
            reward       = self.getReward(stats, newStats, color),
            strategyHash = String(strategy[0]) + String(strategy[1]);

        // Only store reward if strategy doens't was stored for this color yet
        if (!self.rewardsUniq[color][boardHash]) {
          self.rewardsUniq[color][boardHash] = {};
        }
        if (!self.rewardsUniq[color][boardHash][strategyHash]) {
          self.rewardsUniq[color][boardHash][strategyHash] = true;
          self.storeReward(boardElement, boardHash, strategy, reward, color);
        }
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
    getStats: function(boardElement, board, color) {
      var cols = board.length,
          rows = board[0].length;

      return {
        total: $(boardElement).find("." + color).length,
        edges: $(boardElement).find("." + color + "[col=0], ." + color + "[row=0], ." + color + "[col="+(cols-1)+"], ." + color + "[row="+(rows-1)+"]").length,
        corners: $(boardElement).find("." + color + "[col=0][row=0], " +
                                      "." + color + "[col=0][row="+(rows-1)+"], " +
                                      "." + color + "[col="+(cols-1)+"][row=0], " +
                                      "." + color + "[col="+(cols-1)+"][row="+(rows-1)+"]").length
      };
    },

    /**
     * Calculate the difference between stats returned by getStats
     * @return Object
     */
    diffStats: function(previousStats, afterStats) {
      return {
        total: Math.abs(afterStats.total - previousStats.total),
        edges: Math.abs(afterStats.edges - previousStats.edges),
        corners: Math.abs(afterStats.corners - previousStats.corners)
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
    getReward: function(previousStats, afterStats, color) {
      var stats = self.diffStats(previousStats, afterStats);
      return ((stats.corners * 6) + stats.edges + (stats.total/16));
    },

    /*
     * storeReward
     * Add positions and reward to knoweledge base
     */
    storeReward: function(boardElement, boardHash, strategy, reward, color) {
      var tmpBoardElement = $(boardElement).clone(),
          length = $(boardElement).data('board').length,
          tmpBoard = [],
          actionHash, i, j,
          time = new Date();

      // Create virtual board to estimate next board state hash
      $(tmpBoardElement).find('[col][row]').each(function(){
        var col = $(this).attr('col');
        var row = $(this).attr('row');
        if (!tmpBoard[col]) {
          tmpBoard[col] = [];
        }
        tmpBoard[col][row] = $(this);
      });

      // Create map if it doesn't exists
      if (self.rewards[color][boardHash] == null) {
        self.rewards[color][boardHash] = [];
      }
      $.reversi.methods.upsets(tmpBoard, $(tmpBoard).attr('turn'), strategy[0], strategy[1]);
      actionHash = dumpBoard(tmpBoard);
      // console.log("Pushing reward: (" + (new Date() - time) + "ms) " + reward.toString() + " => [" + strategy[0] + ","+strategy[1]+"] => hash => " + actionHash + " / " + boardHash );
      strategy[2] = actionHash;
      self.rewards[color][boardHash].push( {reward: reward, strategy: strategy} );
    },

    /**
     * Recursive Reinforcement Learning Value Function
     *
     * Returns the strategy (col / row) to play
     * @return Array
     */
    mostRewardedStrategy: function(color, boardHash, depth, currentDepth, selectedStrategy) {
      if (self.rewards[color][boardHash] != null) {
        var largerReward = -1,
            length = self.rewards[color][boardHash].length,
            knoweledge, i;

        for(i=0; i<length; i++) {
          knoweledge = self.rewards[color][boardHash][i];
          var knoweledgeReward = self.sumStrategyReward(color, knoweledge.strategy, depth);
          if (knoweledgeReward > largerReward) {
            largerReward = knoweledgeReward;
            strategy = knoweledge.strategy;
          }
        }

        // If found a strategy with low reward, give a try to another random action.
        if (largerReward <= 2 && ((Math.random() * 10) > 3)) {
          return false;
        }
      }
      return false;
    },

    /**
     * sumStrategyReward
     * Recursivelly return board three reward number
     *
     * @return Number
     */
    sumStrategyReward: function(color, strategy, depth, currentDepth) {
      console.log('Sum strategy reward: ' + color + ", " + depth + ", " + currentDepth);
      var rewardSum = 0,
          otherColor = (color == $.reversi.const.CLASS_BLACK) ? $.reversi.const.CLASS_WHITE : $.reversi.const.CLASS_BLACK ;

      if (!currentDepth) {
        currentDepth = -1;
      }
      currentDepth += 1;
      if (currentDepth < depth) {
        var otherStrategies = self.rewards[otherColor][strategy[2]],
            length,
            i;
        console.log("Try recursion: " + strategy[2]);
        if (otherStrategies) {
          length = otherStrategies.length;
          for (i=0; i<length; i++) {
            rewardSum += self.sumStrategyReward(color, otherStrategies[i].strategy, depth, currentDepth);
          }
        }
      }
      return rewardSum;
    }
  }

  /**
   * Convert board data into String
   * Used on Machine Learning to map rewards
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

  /**
   * Allow cloning JavaScript variables to new instance reference
   */
  function clone( obj ) {
      var target = new obj.constructor();
      for ( var key in target ) { delete target[key]; }
      return $.extend( true, target, obj );
  }

  var self = $.reversi.ai.reinforcementLearning;
})(jQuery);

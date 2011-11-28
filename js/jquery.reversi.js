/**
 jquery.reversi.js ver 1.0

The MIT License

Copyright (c) 2011 yapr

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */
(function($) {
  /** Not placed any conditions on the cell */
  var CLASS_BLANK = 'blank';
  var CLASS_BLACK = 'black';
  var CLASS_WHITE = 'white';

  var CLASS_MESSAGE_BAR    = 'message_bar';
  var CLASS_MESSAGE_DIALOG = 'message_dialog';

  /** Event when a stone is placed */
  var EVENT_REVERSI_PUT = 'reversi_put';

  /** Alert message */
  var MESSAGE_CANT_PUT  = 'It is not possible to put it there.';

  /** Shared variables and methods */
  $.reversi = {
    /* Artificial Intelligence */
    ai: {
      /**
       * Default reversi AI
       * Priority to the edges or get a random action
       *
       * Implemented by yapr
       */
      default: {
        action: function(board_element, board, aiColor) {
          // Keep in hands all possibilities
          var keepStrategy = new Array();
          cols = board.length;
          rows = board[0].length;
          for (var i = 0; i < cols; i++) {
            for (var k = 0; k < rows; k++) {
              if (board[i][k].hasClass(CLASS_BLANK)) {
                // Keep in hands if there is a place to put
                if (canPut(board, aiColor, i, k)) {
                  // Priority to the edges
                  if ((i == 0 && k== 0) ||
                      (i == (cols - 1) && k == 0) ||
                      (i == (cols - 1) && k == (rows - 1)) ||
                      (i == 0 && k == (rows -1))) {
                    return triggerPut(board_element, i, k);
                  }
                  keepStrategy[keepStrategy.length] = {col:i, row:k};
                }
              }
            }
          }

          var stragy = keepStrategy[parseInt(Math.random()*keepStrategy.length)];
          setTimeout(function() { triggerPut(board_element, stragy.col, stragy.row) }, 300);
        }
      },

      /*
       * Reinforcement Learning AI
       */
      reinforcementLearning: {
        rewards: { 'white': {}, 'black': {} },

        /**
         * Trigger to put piece at a random possible position
         * It returns the position selected to act
         * @return Object
         */
        randomAction: function(board_element, board, aiColor) {
          var keepStrategy = new Array();
          cols = board.length;
          rows = board[0].length;
          for (var i = 0; i < cols; i++) {
            for (var k = 0; k < rows; k++) {
              if (board[i][k].hasClass(CLASS_BLANK)) {
                if (canPut(board, aiColor, i, k)) {
                  keepStrategy[keepStrategy.length] = {col:i, row:k};
                }
              }
            }
          }
          var stragy = keepStrategy[parseInt(Math.random()*keepStrategy.length)];
          triggerPut(board_element, stragy.col, stragy.row);
          return stragy;
        },

        /**
         * Act using Reinforcement Learning
         * If knoweledge database isn't prepared, populate it using random actions
         */
        action: function(board_element, board, aiColor) {
          var self = $.reversi.ai.reinforcementLearning;

          var boardString = dumpBoard(board);

          var stats = self.getStats(board_element, board);
          if (self.rewards[aiColor][boardString]) {
            // TODO: value function to evaluate more deeper
          } else {
            self.randomAction(board_element, board, aiColor);
          }

          var newStats = self.getStats(board_element, board);
          var reward = self.getReward(stats, newStats, aiColor);
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
        getStats: function(board_element, board) {
          var stats = {};
          var colors = [CLASS_WHITE, CLASS_BLACK];

          var cols = board.length;
          var rows = board[0].length;

          for (var i=0;i<colors.length;i++) {
            var color = colors[i];
            stats[color] = {
              total: $(board_element).find('.' + CLASS_WHITE).length,
              edges: $(board_element).find("." + color + "[col=0], ." + color + "[row=0], ." + color + "[col="+cols+"], ." + color + "[row="+rows+"]").length,
              corners: $(board_element).find("." + color + "[col=0][row=0], ." + color + "[col="+(cols-1)+"][row="+(rows-1)+"]").length
            }
          }
          return stats;
        },

        /**
         * Calculate the difference between stats returned by getStats
         * @return Object
         */
        diffStats: function(previousColorStats, afterColorStats) {
          return {
            total: previousColorStats.total - afterColorStats.total,
            edges: previousColorStats.edges - afterColorStats.edges,
            corners: previousColorStats.corners - afterColorStats.corners
          }
        },

        /**
         * Estimate a reward for the choice made by A.I.
         * @return Number
         */
        getReward: function(previousStats, afterStats, aiColor) {
          var self = $.reversi.ai.reinforcementLearning;
          var otherColor = (aiColor == CLASS_BLACK) ? CLASS_WHITE : CLASS_BLACK;

          var aiStats = self.diffStats(previousStats[aiColor], afterStats[aiColor]);
          var otherStats = self.diffStats(previousStats[otherColor], afterStats[otherColor]);

          // TODO
          // return (aiStats / );
        }

      }
    }
  }

  /* Reversi Implementation */
  $.fn.reversi = function(options){
    /**
     * Default options
     */
    var defaults ={
      ai : $.reversi.ai.default, // artificial intelligence, use 'false' to human controller
      my_color : 'black', //black or white
      cols  : 8  , // Number of columns
      rows  : 8  , // Number of rows
      width : 296, // Width (pixels)
      height: 296  // Height (pixels)
    };

    return this.each(function(){
      var opts = $.extend(defaults, options);

      // Clear previous data
      $(this).unbind(EVENT_REVERSI_PUT);
      $(this).empty();

      //styleの設定
      $(this).addClass('reversi_board');
      $(this).width(opts.width);
      $(this).height(opts.height);

      /** Bidimensional Reversi Board */
      var board = initBoard(opts, this);
      $(this).data('board', board);

      // infomation display component
      var _messagebar = createMessageBar(this, opts.width);
      var _messageDialog = createMessageDialog(this, opts.width);
      var turn = CLASS_BLACK;

      // What happens when the panel is pressed
      $(this).bind(EVENT_REVERSI_PUT, function(e, data){
        //ひっくり返せないので置けない。
        if(!canPut(board, turn, data.col, data.row)){
          showMessage(MESSAGE_CANT_PUT, _messagebar);
          return;
        }

        // Place the stone
        upsets(board, turn, data.col, data.row);

        // Termination decision
        if($.fn.reversi.isFinished(this)){
          var black = $(this).find('.' + CLASS_BLACK).length;
          var white = $(this).find('.' + CLASS_WHITE).length;

          // Determining the winner
          var text = '<h2>' + ((black < white) ? 'White' : 'Black') +  ' win!! (' + black + ' / ' + white + ')</h2>';
          if(black == white){
            text = '<h2>Draw game!</h2>';
          }

          showDialog(text, _messageDialog);
          return;
        }

        // Change in opponent's turn
        turn = nextTurn(board, (turn == CLASS_BLACK) ? CLASS_WHITE : CLASS_BLACK, _messagebar);
        $(this).attr('turn', turn);

        if(opts.ai != false && turn != opts.my_color){
          opts.ai.action.apply(this, [this, board, turn]);
        }
      });

      // If the white sails
      if(opts.ai != false && opts.my_color == CLASS_WHITE){
        opts.ai.action.apply(this, [this, board, turn]);
      }
    });
  };

  /**
   * No more blank space left?
   * @returns Boolean
   */
  $.fn.reversi.isFinished = function(board_elements) {
    return (0 == $(board_elements).find('.' + CLASS_BLANK).length);
  }

  /**
   * Initialization of the board
   * Placing a piece of black and white in the middle
   *
   * @params cols
   * @params rows
   * @return
   */
  function initBoard(opts, board_element){
    var board = [];
    var cols = opts.cols;
    var rows = opts.rows;

    //set cell
    cell_width  = opts.width /opts.cols - 2;//border 1px
    cell_height = cell_width;

    for(var i = 0; i < cols; i++){
      board[i] = [];
      for(var k = 0; k < rows; k++){
        var style_name = CLASS_BLANK;

        // ○●
        // ●○
        if((i == (cols / 2) - 1 && k == (rows / 2) - 1)  || (i == (cols / 2) && k == (rows / 2))){
          style_name = CLASS_BLACK;
        }else if((i == (cols / 2) - 1 && k == (rows / 2)) || (i == (cols / 2) && k == (rows / 2) - 1)){
          style_name = CLASS_WHITE;
        }

        board[i][k] = $("<div/>", {
          "class": style_name,
          "col"  : i,
          "row"  : k,
          "style": 'width:' + cell_width + 'px;height:' + cell_height + 'px;'
        }).appendTo(board_element);
      }
    }

    $(board_element).click(function(e){
      var target = $(e.target);

      target.parent().trigger(EVENT_REVERSI_PUT,
                              {
                                'col' : target.attr('col'),
                                'row' : target.attr('row')
                              }
                             );
    });

    return board;
  }

  /**
   * Place the stone upside down around the stone.
   */
  function upsets(board, style_name, col, row){
    var firstPut = board[col][row];
    firstPut.removeClass(CLASS_BLANK);
    firstPut.addClass(style_name);

    var reverseElements = new Array();
    $.merge(reverseElements, findReverseElements(board, style_name, col, row,  0, -1, false));
    $.merge(reverseElements, findReverseElements(board, style_name, col, row,  1, -1, false));
    $.merge(reverseElements, findReverseElements(board, style_name, col, row,  1,  0, false));
    $.merge(reverseElements, findReverseElements(board, style_name, col, row,  1,  1, false));
    $.merge(reverseElements, findReverseElements(board, style_name, col, row,  0,  1, false));
    $.merge(reverseElements, findReverseElements(board, style_name, col, row, -1,  1, false));
    $.merge(reverseElements, findReverseElements(board, style_name, col, row, -1,  0, false));
    $.merge(reverseElements, findReverseElements(board, style_name, col, row, -1, -1, false));

    $(reverseElements).each(function(){
      this.attr('class', style_name);
    });
  }

  /**
   * To determine the color of your next turn.
   * If there is no place to put the opponent at all turns and the path becomes.
   */
  function nextTurn(board, nextTurnColor, _messagebar){
    cols = board.length;
    rows = board[0].length;
    for(var i = 0; i < cols; i++){
      for(var k = 0; k < cols; k++){
        if(board[i][k].hasClass(CLASS_BLANK)){
          // If the place had become a party to turn
          if(canPut(board, nextTurnColor, i, k)){
            return nextTurnColor;
          }
        }
      }
    }

    //path
    showMessage(nextTurnColor + ' path.', _messagebar);
    return (nextTurnColor == CLASS_BLACK) ? CLASS_WHITE : CLASS_BLACK;
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
        if (board[i][j].hasClass(CLASS_BLACK)) {
          color = 1;
        } else if (board[i][j].hasClass(CLASS_WHITE)) {
          color = 2;
        }
        lines.push(color)
      }
      columns.push(lines)
    }
    return columns.toString();
  }

  /**
   * Whether you can specify the placement of stones
   *
   * Stones placed conditions:
   * Next match (vertical, horizontal, diagonal) with different colored stones,
   * That his color on the diagonal.
   */
  function canPut(board, class_color, col, row){
    //isBlank
    if(!board[col][row].hasClass(CLASS_BLANK)){
      return false;
    }

    var canReverseArray = new Array();

    return ($.merge(canReverseArray, findReverseElements(board, class_color, col, row,  0, -1)).length ||
            $.merge(canReverseArray, findReverseElements(board, class_color, col, row,  0, -1)).length ||
            $.merge(canReverseArray, findReverseElements(board, class_color, col, row,  1, -1)).length ||
            $.merge(canReverseArray, findReverseElements(board, class_color, col, row,  1,  0)).length ||
            $.merge(canReverseArray, findReverseElements(board, class_color, col, row,  1,  1)).length ||
            $.merge(canReverseArray, findReverseElements(board, class_color, col, row,  0,  1)).length ||
            $.merge(canReverseArray, findReverseElements(board, class_color, col, row, -1,  1)).length ||
            $.merge(canReverseArray, findReverseElements(board, class_color, col, row, -1,  0)).length ||
            $.merge(canReverseArray, findReverseElements(board, class_color, col, row, -1, -1)).length);
  }

  /**
   * From the specified position and direction favored
   * Returns Stones that can overturn
   * @return Array
   */
  function findReverseElements(board, style_name, current_col, current_row, advances_col_index, advances_row_index){
    var reverseArray = new Array();
    var max_col = board.length -1;
    var max_row = board[0].length - 1;

    for(var i = 1 ;; i++){
      var col = parseInt(current_col) + advances_col_index * i;
      var row = parseInt(current_row) + advances_row_index * i;

      // If you went to the edge
      if(col > max_col
         || col < 0
       || row > max_row
       || row < 0){
         break;
       }

       // If it has the same adjacent stones
       var div = board[col][row];
       if(div.hasClass(CLASS_BLANK)
          || (i == 1 && div.hasClass(style_name))){
            break;
          }

          if(div.hasClass(style_name)){
            // The color of his return there later in the first diagonal
            return reverseArray;
            break;
          } else {
            // To keep the stone upside down.
            reverseArray[reverseArray.length] = div;
          }
    }

    return new Array();
  }

  /**
   * Trigger EVENT_REVERSI_PUT
   */
  function triggerPut(board_element, col, row) {
    return $(board_element).trigger(EVENT_REVERSI_PUT, { 'col' : col, 'row' : row });
  }

  /**
   * To generate the message area
   * @returns Element
   */
  function createMessageBar(board_element, width){
    //statusmessage
    return $("<div/>", {
      "class": CLASS_MESSAGE_BAR,
      "style": "display:none;width:" + eval(width - 8) + "px;"
    }).appendTo(board_element);
  }

  /**
   * To generate the dialog area
   */
  function createMessageDialog(board_element, width){
    //statusmessage
    return $("<div/>", {
      "class": CLASS_MESSAGE_DIALOG,
      "style": "display:none;width:" + width * 2/3 + "px;left:" + width / 6  + "px;"
    }).appendTo(board_element);
  }

  /**
   * To view the message in the panel.
   */
  function showMessage(text, _messagebar){
    _messagebar.stop().css("opacity", 1)
    .text(text)
    .fadeIn(30).fadeOut(1800);
  }

  /**
   * To display the dialog.
   */
  function showDialog(text, elem){
    $(elem).closest("." + CLASS_MESSAGE_DIALOG)
    .stop()
    .css("opacity", 1)
    .html(text)
    .fadeIn(90);
  }
})(jQuery);

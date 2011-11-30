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
  $.reversi = {
    // Public Constants
    const: {
      /** Not placed any conditions on the cell */
      CLASS_BLANK: 'blank',
      CLASS_BLACK: 'black',
      CLASS_WHITE: 'white',

      CLASS_MESSAGE_BAR   : 'message_bar',
      CLASS_MESSAGE_DIALOG: 'message_dialog',

      /** Event when a stone is placed */
      EVENT_REVERSI_PUT: 'reversi_put',

      /** Alert message */
      MESSAGE_CANT_PUT : 'It is not possible to put it there.'
    },

    // Public methods
    methods: {
      /**
       * Whether you can specify the placement of stones
       *
       * Stones placed conditions:
       * Next match (vertical, horizontal, diagonal) with different colored stones,
       * That his color on the diagonal.
       */
      canPut: function(board, class_color, col, row){
        //isBlank
        if(!board[col][row].hasClass($.reversi.const.CLASS_BLANK)){
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
      },

      /**
       * Trigger EVENT_REVERSI_PUT
       */
      triggerPut: function(board_element, col, row) {
        return $(board_element).trigger($.reversi.const.EVENT_REVERSI_PUT, { 'col' : col, 'row' : row });
      },

      /**
       * Is the end of the game?
       * Check for
       *  - 0 blank spaces
       *  - 0 pieces of a color
       *  - no player can play in the last position
       *
       * @returns Boolean
       */
      isFinished: function(board_elements) {
        var blank = $(board_elements).find('.' + $.reversi.const.CLASS_BLANK);
        var board = $(board_elements).data('board');

        return (0 == blank.length) ||
               (0 == $(board_elements).find('.' + $.reversi.const.CLASS_WHITE).length) ||
               (0 == $(board_elements).find('.' + $.reversi.const.CLASS_BLACK).length) ||
               ( (blank.length == 1) ?
                  (!$.reversi.methods.canPut(board, $.reversi.const.CLASS_BLACK, $(blank).attr('col'), $(blank).attr('row')) &&
                   !$.reversi.methods.canPut(board, $.reversi.const.CLASS_WHITE, $(blank).attr('col'), $(blank).attr('row')))
                  : false
               );
      },

      /**
       * Place the stone upside down around the stone.
       */
      upsets: function(board, style_name, col, row){
        var firstPut = board[col][row];
        firstPut.removeClass($.reversi.const.CLASS_BLANK);
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


    },

    /**
     * Artificial Intelligence Agents:
     * Must implement 'action' method, calling Reversi triggetPut method to proceed the game
     */
    ai: {

      /**
       * Default Reversi AI: implemented by yapr
       * priority to the edges or get a random action
       */
      default: {
        action: function(board_element, board, aiColor) {
          // Keep in hands all possibilities
          var keepStrategy = new Array();
          cols = board.length;
          rows = board[0].length;
          for (var i = 0; i < cols; i++) {
            for (var k = 0; k < rows; k++) {
              if (board[i][k].hasClass($.reversi.const.CLASS_BLANK)) {
                // Keep in hands if there is a place to put
                if ($.reversi.methods.canPut(board, aiColor, i, k)) {
                  // Priority to the edges
                  if ((i == 0 && k== 0) ||
                      (i == (cols - 1) && k == 0) ||
                      (i == (cols - 1) && k == (rows - 1)) ||
                      (i == 0 && k == (rows -1))) {
                    return $.reversi.methods.triggerPut(board_element, i, k);
                  }
                  keepStrategy[keepStrategy.length] = {col:i, row:k};
                }
              }
            }
          }

          var strategy = keepStrategy[parseInt(Math.random()*keepStrategy.length)];
          // Maybe no strategy found
          if (strategy != false) {
            setTimeout(function() { $.reversi.methods.triggerPut(board_element, strategy.col, strategy.row) }, 300);
          }
        }
      }
    }
  }


  /*
   * Reversi Implementation
   */
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
      $(this).unbind($.reversi.const.EVENT_REVERSI_PUT);
      $(this).empty();

      // GUI / Style
      $(this).addClass('reversi_board');
      $(this).width(opts.width);
      $(this).height(opts.height);

      // Bidimensional Reversi Board
      var board = initBoard(opts, this);
      $(this).data('board', board);

      // infomation display component
      var _messagebar = createMessageBar(this, opts.width);
      var _messageDialog = createMessageDialog(this, opts.width);
      var turn = $.reversi.const.CLASS_BLACK;

      // Event when a player
      $(this).bind($.reversi.const.EVENT_REVERSI_PUT, function(e, data){
        // Skip when try to put on invalid position
        if(!$.reversi.methods.canPut(board, turn, data.col, data.row)){
          //showMessage($.reversi.const.MESSAGE_CANT_PUT, _messagebar);
          return;
        }

        // Place the stone
        $.reversi.methods.upsets(board, turn, data.col, data.row);

        // Termination decision
        if($.reversi.methods.isFinished(this)){
          var black = $(this).find('.' + $.reversi.const.CLASS_BLACK).length;
          var white = $(this).find('.' + $.reversi.const.CLASS_WHITE).length;

          // Display the winner
          var text = '<h2>' + ((black < white) ? 'White' : 'Black') +  ' win!! (' + black + ' / ' + white + ')</h2>';
          if(black == white) {
            text = '<h2>Draw game!</h2>';
          }
          showDialog(text, _messageDialog);
          return;
        }

        // Change in opponent's turn
        turn = nextTurn(board, (turn == $.reversi.const.CLASS_BLACK) ? $.reversi.const.CLASS_WHITE : $.reversi.const.CLASS_BLACK, _messagebar);
        $(this).attr('turn', turn);

        if(opts.ai != false && turn != opts.my_color){
          opts.ai.action.apply(this, [this, board, turn]);
        }
      });

      // If the white sails
      if(opts.ai != false && opts.my_color == $.reversi.const.CLASS_WHITE){
        opts.ai.action.apply(this, [this, board, turn]);
      }
    });
  };


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
        var style_name = $.reversi.const.CLASS_BLANK;

        // ○●
        // ●○
        if((i == (cols / 2) - 1 && k == (rows / 2) - 1)  || (i == (cols / 2) && k == (rows / 2))){
          style_name = $.reversi.const.CLASS_BLACK;
        }else if((i == (cols / 2) - 1 && k == (rows / 2)) || (i == (cols / 2) && k == (rows / 2) - 1)){
          style_name = $.reversi.const.CLASS_WHITE;
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

      target.parent().trigger($.reversi.const.EVENT_REVERSI_PUT,
                              {
                                'col' : target.attr('col'),
                                'row' : target.attr('row')
                              }
                             );
    });

    return board;
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
        if(board[i][k].hasClass($.reversi.const.CLASS_BLANK)){
          // If the place had become a party to turn
          if($.reversi.methods.canPut(board, nextTurnColor, i, k)){
            return nextTurnColor;
          }
        }
      }
    }

    //path
    showMessage(nextTurnColor + ' path.', _messagebar);
    return (nextTurnColor == $.reversi.const.CLASS_BLACK) ? $.reversi.const.CLASS_WHITE : $.reversi.const.CLASS_BLACK;
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
       if(div.hasClass($.reversi.const.CLASS_BLANK)
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
   * To generate the message area
   * @returns Element
   */
  function createMessageBar(board_element, width){
    //statusmessage
    return $("<div/>", {
      "class": $.reversi.const.CLASS_MESSAGE_BAR,
      "style": "display:none;width:" + eval(width - 8) + "px;"
    }).appendTo(board_element);
  }

  /**
   * To generate the dialog area
   */
  function createMessageDialog(board_element, width){
    //statusmessage
    return $("<div/>", {
      "class": $.reversi.const.CLASS_MESSAGE_DIALOG,
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
    $(elem).closest("." + $.reversi.const.CLASS_MESSAGE_DIALOG)
    .stop()
    .css("opacity", 1)
    .html(text)
    .fadeIn(90);
  }
})(jQuery);

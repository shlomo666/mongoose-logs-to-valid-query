const redSelection = document.getElementById('redSelection');
redSelection.disabled = true;

(() => {
  output.onkeydown = (ev) => {
    if (ev.key === 'ArrowDown' && ev.altKey) {
      replaceWithNextBlock();
      ev.stopPropagation();
      ev.preventDefault();
    }
    if (ev.key === 'ArrowUp' && ev.altKey) {
      replaceWithPrevBlock();
      ev.stopPropagation();
      ev.preventDefault();
    }
  };

  function replaceWithNextBlock() {
    const text = output.value;
    const inputText = input.value;
    const from = output.selectionStart;
    const to = output.selectionEnd;

    const blockInOutput = getBlock(text, from - 1, to);
    if (!blockInOutput) return;
    if (blockInOutput.start === text.indexOf('[')) return;
    const { block, start, end } = getMatchingBlock(
      text,
      blockInOutput.start,
      blockInOutput.end,
      inputText
    );
    const nextBlockInOutput = getNextBlock(blockInOutput.end, text);
    if (!nextBlockInOutput) return;
    const {
      block: nextBlock,
      start: nextStart,
      end: nextEnd
    } = getMatchingBlock(
      text,
      nextBlockInOutput.start,
      nextBlockInOutput.end,
      inputText
    );

    if (
      scopes(inputText.slice(0, start)) ===
      scopes(inputText.slice(0, nextStart))
    ) {
      replaceInputJson(start, nextEnd, evaluate(nextBlock), evaluate(block));
      setTimeout(() => {
        output.focus();
        const whereIsTheCursorInBlock = from - blockInOutput.start;
        const whereToPutTheCursor =
          getNextBlock(
            getBlock(
              output.value,
              blockInOutput.start + 1,
              blockInOutput.start + 1
            ).end,
            output.value
          ).start + whereIsTheCursorInBlock;

        const secondSelection = getBlock(
          output.value,
          whereToPutTheCursor - 1,
          whereToPutTheCursor
        );
        const firstSelection = getPrevBlock(
          secondSelection.start,
          output.value
        );
        redSelection.disabled = false;
        output.setSelectionRange(firstSelection.start, firstSelection.end);
        setTimeout(() => {
          redSelection.disabled = true;
          output.setSelectionRange(secondSelection.start, secondSelection.end);
        }, 150);
        setTimeout(() => {
          output.setSelectionRange(whereToPutTheCursor, whereToPutTheCursor);
        }, 300);
      }, 100);
      action();
    }
  }

  function replaceWithPrevBlock() {
    const text = output.value;
    const inputText = input.value;
    const from = output.selectionStart;
    const to = output.selectionEnd;

    const blockInOutput = getBlock(text, from - 1, to);
    if (!blockInOutput) return;
    if (blockInOutput.start === text.indexOf('[')) return;
    const { block, start, end } = getMatchingBlock(
      text,
      blockInOutput.start,
      blockInOutput.end,
      inputText
    );
    const prevBlockInOutput = getPrevBlock(blockInOutput.start, text);
    if (!prevBlockInOutput) return;
    const {
      block: prevBlock,
      start: prevStart,
      end: prevEnd
    } = getMatchingBlock(
      text,
      prevBlockInOutput.start,
      prevBlockInOutput.end,
      inputText
    );

    if (
      scopes(inputText.slice(0, start)) ===
      scopes(inputText.slice(0, prevStart))
    ) {
      replaceInputJson(prevStart, end, evaluate(block), evaluate(prevBlock));
      setTimeout(() => {
        output.focus();
        const whereIsTheCursorInBlock = from - blockInOutput.start;
        const whereToPutTheCursor =
          prevBlockInOutput.start + whereIsTheCursorInBlock;

        const secondSelection = getBlock(
          output.value,
          whereToPutTheCursor - 1,
          whereToPutTheCursor
        );
        const firstSelection = getNextBlock(secondSelection.end, output.value);
        redSelection.disabled = false;
        output.setSelectionRange(firstSelection.start, firstSelection.end);
        setTimeout(() => {
          redSelection.disabled = true;
          output.setSelectionRange(secondSelection.start, secondSelection.end);
        }, 100);
        setTimeout(() => {
          output.setSelectionRange(whereToPutTheCursor, whereToPutTheCursor);
        }, 200);
      }, 100);
      action();
    }
  }
})();

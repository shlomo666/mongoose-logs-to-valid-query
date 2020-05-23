(() => {
  const canvas = document.createElement('canvas');
  function getTextWidth(text, font) {
    var context = canvas.getContext('2d');
    context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
  }

  let mouseOverSelection = false;
  output.onmousemove = (ev) => {
    if (mouseOverSelection) {
      mouseOverSelection = false;
      output.setSelectionRange(0, 0);
    }
    const { offsetX, offsetY } = ev;
    const lines = output.value.split('\n');
    const lineHight = output.scrollHeight / lines.length;
    const [x, y] = [offsetX, offsetY + output.scrollTop];
    const line = parseInt(y / lineHight);
    if (line < 0 || line > lines.length) {
      return;
    }
    const lineText = lines[line];
    const lineWidth = getTextWidth(lineText, output.style.font);
    if (lineWidth < x) {
      return;
    }
    let width = 0;
    let charIdx = -1;
    while (width < x) {
      width = getTextWidth(lineText.slice(0, ++charIdx + 1), output.style.font);
    }

    const currTextIdx = lines.slice(0, line).join('\n').length + charIdx;

    const from = currTextIdx;
    const to = currTextIdx + 1;

    const { suggestions, start, end } = getSuggestions(from, to);
    if (suggestions.length && document.activeElement === output) {
      mouseOverSelection = true;
      output.setSelectionRange(start, end + 1);
    }
  };
})();

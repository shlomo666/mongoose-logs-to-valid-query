(() => {
  const canvas = document.createElement('canvas');
  function getTextWidth(text, font) {
    var context = canvas.getContext('2d');
    context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
  }

  window.onresize = () => setLineHeightInOutputBox();
  let lineHeight;
  setLineHeightInOutputBox();
  function setLineHeightInOutputBox() {
    const tempValue = output.value;
    output.value = '\n'.repeat(1000 - 1);
    lineHeight = output.scrollHeight / 1000;
    output.value = tempValue;
  }

  let mouseIsDown = false;
  output.onmousedown = () => (mouseIsDown = true);
  output.onmouseup = () => (mouseIsDown = false);

  let mouseOverSelection = false;
  output.onmousemove = (ev) => {
    if (mouseOverSelection) {
      mouseOverSelection = false;
      output.setSelectionRange(0, 0);
    }
    if (mouseIsDown || output.selectionEnd - output.selectionStart > 1) {
      return;
    }

    const { offsetX, offsetY } = ev;
    const lines = output.value.split('\n');
    const [x, y] = [offsetX, offsetY + output.scrollTop];
    const line = parseInt(y / lineHeight);
    if (line < 0 || line >= lines.length) {
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

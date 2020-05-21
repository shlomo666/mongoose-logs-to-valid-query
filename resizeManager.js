(() => {
  // Resize scripts
  const input = document.getElementById('inputCode');
  const output = document.getElementById('outputCode');

  function resizeBoth() {
    if (localStorage.inputWidth) {
      input.style.width = Number(localStorage.inputWidth) + '%';
      output.style.width = 100 - 1 - localStorage.inputWidth + '%';
    }
  }

  resizeBoth();
  window.onresize = resizeBoth;

  const setWidth = () => {
    if (localStorage.inputWidth) {
      output.style.width = 100 - 1 - localStorage.inputWidth + '%';
    }
  };
  function manageResizeManually() {
    requestAnimationFrame(() => {
      localStorage.inputWidth = Math.ceil(
        (input.clientWidth / input.parentElement.clientWidth) * 100
      );
      setWidth();
      manageResizeManually();
    });
  }

  manageResizeManually();
})();

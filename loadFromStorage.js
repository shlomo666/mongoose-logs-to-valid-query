document.getElementById('shouldIds').checked =
  localStorage.shouldIds === 'true';
document.getElementById('shouldDates').checked =
  localStorage.shouldDates === 'true';
document.getElementById('maxCollapse').value =
  Number(localStorage.maxCollapse) || DEFAULT_MAX_COLLAPSE;

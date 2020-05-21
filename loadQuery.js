window.onload = () => {
  const queryEnc = window.location.search.split('query=').pop();
  const query = atob(queryEnc);
  setTimeout(() => {
    document.getElementById('inputCode').value = query;
    action();
  }, 10);
};

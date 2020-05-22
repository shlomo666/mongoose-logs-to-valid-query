const setFromQuery = () => {
  const queryEnc = window.location.search.split('query=').pop();
  const query = atob(queryEnc);
  setTimeout(() => {
    document.getElementById('inputCode').value = query;
    action(true);
  }, 10);
};

window.onpopstate = setFromQuery;
window.onload = setFromQuery;

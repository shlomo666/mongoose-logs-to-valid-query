const setFromQuery = () => {
  const queryEnc = window.location.search.split('query=').pop();
  const query = atob(queryEnc);
  setTimeout(() => {
    document.getElementById('inputCode').value = query;
    action(true);
    setTimeout(() => {
      if (query) {
        document.getElementById('outputCode').focus();
      } else {
        document.getElementById('inputCode').focus();
      }
    }, 10);
  }, 10);
};

window.onpopstate = setFromQuery;
window.onload = setFromQuery;

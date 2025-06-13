function includeHTML() {
  const elements = document.querySelectorAll('[w3-include-html]');
  elements.forEach(async (el) => {
    const file = el.getAttribute('w3-include-html');
    if (file) {
      try {
        const response = await fetch(file);
        const html = await response.text();
        el.innerHTML = html;
        el.removeAttribute('w3-include-html');
        includeHTML(); // nếu trong file được include lại có include
      } catch (err) {
        el.innerHTML = "Component not found.";
        console.error("Error including", file);
      }
    }
  });
}
includeHTML();

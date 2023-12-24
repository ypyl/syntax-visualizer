//@ts-check

(function () {
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "node": {
        updateProperties(message.data);
        break;
      }
    }
  });

  function updateProperties(data) {
    const body = document.querySelector("body");
    if (body == null) return;
    body.textContent = "";
    const table = document.createElement("table");
    for (const key in data) {
      const tr = document.createElement("tr");
      const tdKey = document.createElement("td");
      tdKey.textContent = key;
      tr.appendChild(tdKey);
      const tdValue = document.createElement("td");
      tdValue.classList.add("collapsed");
      tdValue.textContent = data[key];
      const originalText = tdValue.textContent;

      // Check if the text exceeds 120 characters
      if (originalText && originalText.length > 120) {
        // Trim the text to 120 characters and add an ellipsis
        var truncatedText = originalText.substring(0, 120) + "…";

        // Set the truncated text as the content
        tdValue.textContent = truncatedText;

        // Add a click event listener to toggle between collapsed and expanded state
        tdValue.addEventListener("click", function () {
          if (tdValue.classList.contains("collapsed")) {
            // Expand the text
            tdValue.textContent = originalText;
            tdValue.classList.remove("collapsed");
          } else {
            // Collapse the text
            tdValue.textContent = truncatedText;
            tdValue.classList.add("collapsed");
          }
        });
      }
      tr.appendChild(tdValue);
      table.appendChild(tr);
    }
    body.appendChild(table);
  }
})();

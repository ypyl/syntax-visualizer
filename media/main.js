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
      tdValue.textContent = data[key];
      tr.appendChild(tdValue);
      table.appendChild(tr);
    }
    body.appendChild(table)
  }
})();

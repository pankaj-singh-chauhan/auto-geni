document.addEventListener("DOMContentLoaded", () => {
  const htmlInput = document.getElementById("htmlInput");
  const htmlFile = document.getElementById("htmlFile");
  const extractBtn = document.getElementById("extractBtn");
  const divIdInput = document.getElementById("divId");
  const table = document.getElementById("outputTable");
  const copyBtn = document.getElementById("copyBtn");
  const downloadExcelBtn = document.getElementById("downloadExcelBtn");
  const columnsDiv = document.getElementById("columns");
  const addColumnBtn = document.getElementById("addColumnBtn");
  const includeAnchorText = document.getElementById("includeAnchorText");

  let columnConfigs = [{ name: "Generated Content", template: "Some content {{}}" }];

  // Render columns
  function renderColumns() {
    columnsDiv.innerHTML = "";
    columnConfigs.forEach((col, i) => {
      const div = document.createElement("div");
      div.classList.add("column-row");
      div.innerHTML = `
        <input type="text" value="${col.name}" placeholder="Column name">
        <input type="text" value="${col.template}" placeholder="Template (use {{}} for serial no)">
        <button data-index="${i}" class="removeColumnBtn">❌</button>
      `;
      columnsDiv.appendChild(div);
    });

    document.querySelectorAll(".removeColumnBtn").forEach(btn => {
      btn.addEventListener("click", e => {
        const index = e.target.getAttribute("data-index");
        columnConfigs.splice(index, 1);
        renderColumns();
      });
    });
  }

  renderColumns();

  addColumnBtn.addEventListener("click", () => {
    columnConfigs.push({ name: "New Column", template: "Content {{}}" });
    renderColumns();
  });

  htmlFile.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => htmlInput.value = e.target.result;
      reader.readAsText(file);
    }
  });

  extractBtn.addEventListener("click", () => {
    let html = htmlInput.value;
    if (!html) return alert("Please paste or upload HTML content.");

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    let anchors = [];
    const divId = divIdInput.value.trim();
    if (divId) {
      const container = doc.getElementById(divId);
      if (container) anchors = container.querySelectorAll("a");
      else return alert("Div ID not found in HTML.");
    } else {
      anchors = doc.querySelectorAll("a");
    }

    const links = Array.from(anchors)
      .map(a => ({
        href: a.href.replace(/\?.*$/, ""), // clean query params
        text: a.textContent.trim() || "(no text)"
      }))
      .filter(a => a.href);

    renderTable(links);
  });

  function renderTable(links) {
    if (!links.length) return alert("No links found.");
    let html = "<tr><th>#</th><th>Link</th>";
    if (includeAnchorText.checked) html += "<th>Anchor Text</th>";
    columnConfigs.forEach(c => html += `<th>${c.name}</th>`);
    html += "</tr>";

    links.forEach((l, i) => {
      html += `<tr><td>${i + 1}</td><td>${l.href}</td>`;
      if (includeAnchorText.checked) html += `<td>${l.text}</td>`;
      columnConfigs.forEach(c => {
        const val = c.template.replace("{{}}", i + 1);
        html += `<td>${val}</td>`;
      });
      html += "</tr>";
    });

    table.innerHTML = html;
  }

  copyBtn.addEventListener("click", () => {
    const range = document.createRange();
    range.selectNode(table);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
    alert("Copied to clipboard!");
  });

  downloadExcelBtn.addEventListener("click", () => {
    const rows = Array.from(table.querySelectorAll("tr")).map(tr =>
      Array.from(tr.children).map(td => td.innerText)
    );

    let csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "links.csv";
    link.click();
  });
});

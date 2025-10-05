document.addEventListener("DOMContentLoaded", () => {
  const htmlInput = document.getElementById("htmlInput");
  const htmlFile = document.getElementById("htmlFile");
  const divIdInput = document.getElementById("divId");
  const table = document.getElementById("outputTable");
  const extractNumberFromImage = document.getElementById("extractNumberFromImage");
  const copyBtn = document.getElementById("copyBtn");
  const downloadExcelBtn = document.getElementById("downloadExcelBtn");
  const columnsDiv = document.getElementById("columns");
  const addColumnBtn = document.getElementById("addColumnBtn");
  const generateBtn = document.getElementById("generateBtn");

  let columnConfigs = [{ name: "Generated Content", template: "Some content {{}}" }];

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
        // Get current column values before removing
        const currentColumns = Array.from(columnsDiv.querySelectorAll('.column-row')).map(row => ({
          name: row.querySelector('input:first-child').value,
          template: row.querySelector('input:nth-child(2)').value
        }));
        columnConfigs = currentColumns;
        columnConfigs.splice(index, 1);
        renderColumns();
        // Generate table with updated columns
        generateLinks();
      });
    });

    // Add input change listeners to update columnConfigs
    columnsDiv.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        const currentColumns = Array.from(columnsDiv.querySelectorAll('.column-row')).map(row => ({
          name: row.querySelector('input:first-child').value,
          template: row.querySelector('input:nth-child(2)').value
        }));
        columnConfigs = currentColumns;
      });
    });
  }

  renderColumns();

  addColumnBtn.addEventListener("click", () => {
    // Get current column values before adding new one
    const currentColumns = Array.from(columnsDiv.querySelectorAll('.column-row')).map(row => ({
      name: row.querySelector('input:first-child').value,
      template: row.querySelector('input:nth-child(2)').value
    }));
    columnConfigs = currentColumns;
    // Add new column
    columnConfigs.push({ name: "New Column", template: "Content {{}}" });
    renderColumns();
    // Generate table with updated columns
    generateLinks();
  });

  htmlFile.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        htmlInput.value = e.target.result;
        generateLinks();
      };
      reader.readAsText(file);
    }
  });

  htmlInput.addEventListener("input", () => {
    if (htmlInput.value.trim().length > 50) generateLinks();
  });

  generateBtn.addEventListener("click", () => generateLinks());

  function generateLinks() {
    const html = htmlInput.value.trim();
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
  }

  // Pattern registry for number extraction
  const numberPatterns = {
    // Word numbers with underscore (e.g., image_one.jpg)
    wordWithUnderscore: {
      pattern: word => new RegExp('_(' + word + ')', 'i'),
      numbers: {
        'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
        'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
        'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
        'fourteen': 14, 'fifteen': 15, 'sixteen': 16,
        'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
        'twenty': 20
      },
      extract: (url, pattern) => {
        const match = url.match(pattern);
        return match ? match[1].toLowerCase() : null;
      }
    },
    // Direct numbers after common prefixes (e.g., img1, image2)
    prefixNumber: {
      pattern: () => /(?:img|image)(\d+)/i,
      extract: (url, pattern) => {
        const match = url.match(pattern);
        return match ? match[1] : null;
      }
    }
  };

  function extractNumberFromUrl(url) {
    // Try word-based patterns
    const wordPattern = numberPatterns.wordWithUnderscore;
    const wordRegex = wordPattern.pattern(Object.keys(wordPattern.numbers).join('|'));
    const wordMatch = wordPattern.extract(url, wordRegex);
    if (wordMatch && wordPattern.numbers.hasOwnProperty(wordMatch)) {
      return wordPattern.numbers[wordMatch];
    }

    // Try prefix-number patterns
    const prefixPattern = numberPatterns.prefixNumber;
    const prefixMatch = prefixPattern.extract(url, prefixPattern.pattern());
    if (prefixMatch) {
      return parseInt(prefixMatch, 10);
    }

    return null;
  }

  // Helper function to add new number word patterns
  function addNumberWordPattern(word, value) {
    numberPatterns.wordWithUnderscore.numbers[word.toLowerCase()] = value;
  }

  // Helper function to add new prefix pattern
  function addPrefixPattern(prefix) {
    const existingPattern = numberPatterns.prefixNumber.pattern().source;
    const newPattern = existingPattern.replace(
      /\(\?:([^)]+)\)/,
      match => `(?:${match.slice(3, -1)}|${prefix})`
    );
    numberPatterns.prefixNumber.pattern = () => new RegExp(newPattern, 'i');
  }

  function renderTable(links) {
    if (!links.length) return alert("No links found.");
    let html = "<tr><th>Link</th>";
    
    // Get current column configurations from the inputs
    const currentColumns = Array.from(columnsDiv.querySelectorAll('.column-row')).map(row => ({
      name: row.querySelector('input:first-child').value,
      template: row.querySelector('input:nth-child(2)').value
    }));
    
    currentColumns.forEach(c => html += `<th>${c.name}</th>`);
    html += "</tr>";

    links.forEach((l, i) => {
      let numberToUse = i + 1;
      if (extractNumberFromImage.checked) {
        const extractedNumber = extractNumberFromUrl(l.href);
        if (extractedNumber !== null) {
          numberToUse = extractedNumber;
        }
      }
      html += `<tr><td>${l.href}</td>`;
      currentColumns.forEach(c => {
        const val = c.template.replace("{{}}", numberToUse);
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
    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "links.csv";
    link.click();
  });
});

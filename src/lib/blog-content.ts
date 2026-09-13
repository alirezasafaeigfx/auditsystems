export function renderBlogContent(content: string): string {
  const output: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (!listOpen) return;
    output.push("</ul>");
    listOpen = false;
  };

  for (const line of content.split("\n")) {
    if (line.startsWith("- ")) {
      if (!listOpen) {
        output.push("<ul>");
        listOpen = true;
      }
      output.push(`<li>${line.slice(2)}</li>`);
      continue;
    }

    closeList();
    if (line.startsWith("## ")) output.push(`<h2>${line.slice(3)}</h2>`);
    else if (line.startsWith("### ")) output.push(`<h3>${line.slice(4)}</h3>`);
    else if (line.trim() === "") output.push("");
    else output.push(`<p>${line}</p>`);
  }

  closeList();
  return output.join("\n");
}

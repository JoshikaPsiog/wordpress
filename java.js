class Editor {
  constructor(editorId) {
    this.editor = document.getElementById(editorId);
    this.initToolbar();
  }
  initToolbar() {
  document.querySelectorAll(".toolbar button, .toolbar select").forEach(el => {
    el.addEventListener("click", () => {
      const command = el.dataset.command;
      if (el.tagName === "SELECT") {
        document.execCommand(command, false, el.value);
      } else {
        document.execCommand(command, false, null);
      }
    });
  });
}
}

document.addEventListener("DOMContentLoaded", () => {
  new Editor("editor");
});


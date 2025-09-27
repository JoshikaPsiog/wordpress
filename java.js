class Editor {
  constructor(editorId) {
    this.editor = document.getElementById(editorId);
    this.initToolbar();
  }

  initToolbar() {
    document.querySelectorAll(".toolbar button").forEach(button => {
      button.addEventListener("click", () => {
        const command = button.dataset.command;
        document.execCommand(command, false, null);
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Editor("editor");
});


class Editor {
  constructor(editorId) {
    this.editor = document.getElementById(editorId);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Editor("editor");
});

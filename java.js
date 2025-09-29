class Editor {
  constructor(containerId){
    this.el = document.getElementById(containerId);
    this.initialHTML = this.el.innerHTML;
  }

  exec(command, value = null){
    try { document.execCommand(command, false, value); }
    catch(err){ console.warn('execCommand failed', command, err); }
    this.el.focus();
  }

  insertHTML(html){
    try { document.execCommand('insertHTML', false, html); }
    catch(e) {
      const sel = window.getSelection();
      if(!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const frag = range.createContextualFragment(html);
      range.deleteContents();
      range.insertNode(frag);
    }
    this.el.focus();
  }

  getHTML(){ return this.el.innerHTML; }
  getText(){ return this.el.innerText; }
  setHTML(h){ this.el.innerHTML = h; }
  reset(){ this.setHTML(this.initialHTML); }

  clearFormatting(){
    const tmp = document.createElement('div');
    tmp.innerHTML = this.getHTML();
    tmp.querySelectorAll('*').forEach(n => { n.removeAttribute('style'); n.removeAttribute('class'); });
    this.setHTML(tmp.innerHTML);
  }
}

class Exporter {
  constructor(editor, titleEl, authorEl){
    this.editor = editor;
    this.titleEl = titleEl;
    this.authorEl = authorEl;
  }

  wrapHTML(content){
    const title = this.escape(this.titleEl.value || 'Untitled');
    const author = this.escape(this.authorEl.value || 'Anonymous');
    return `
      <!doctype html><html><head><meta charset="utf-8">
      <meta name="Author" content="${author}">
      <title>${title}</title>
      <style>body{font-family: Arial, Helvetica, sans-serif; padding:20px} table{border-collapse:collapse} td,th{border:1px solid #333;padding:6px}</style>
      </head><body><header><h1>${title}</h1><p><em>Author: ${author}</em></p><hr/></header>${content}</body></html>
    `;
  }

  escape(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  toDoc(filename){
    filename = filename || (this.titleEl.value ? this.titleEl.value.replace(/\s+/g,'_')+'.doc' : 'document.doc');
    const html = this.wrapHTML(this.editor.getHTML());
    const blob = new Blob([html], { type: 'application/msword' });
    this.downloadBlob(blob, filename);
  }

toPDF(filename){
  filename = filename || 'document.pdf';
  const content = this.wrapHTML(this.editor.getHTML());
  const temp = document.createElement('div');
  temp.style.padding = '12px';
  temp.innerHTML = content;
  document.body.appendChild(temp);

  // Wait for all images to load
  const images = temp.querySelectorAll('img');
  let loadedCount = 0;
  if(images.length===0){ savePDF(); }
  else {
    images.forEach(img=>{
      img.onload = img.onerror = ()=>{
        loadedCount++;
        if(loadedCount===images.length) savePDF();
      };
    });
  }

  function savePDF(){
    const opt = { margin:0.5, filename, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'in',format:'a4',orientation:'portrait'} };
    html2pdf().set(opt).from(temp).save().then(()=> temp.remove()).catch(()=> temp.remove());
  }
}


  downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
}
const pageBreakBtn = document.getElementById("insert-page-break");
const editor = document.getElementById("editor");

pageBreakBtn.addEventListener("click", () => {
  const pageBreak = document.createElement("div");
  pageBreak.className = "page-break";
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    range.insertNode(pageBreak);
    range.setStartAfter(pageBreak);
    range.setEndAfter(pageBreak);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.appendChild(pageBreak);
  }
});



class Toolbar {
  constructor(containerId, editor, exporter){
    this.container = document.getElementById(containerId);
    this.editor = editor;
    this.exporter = exporter;
    this.build();
    this.bindKeyboardShortcuts();
  }

  chip(children=[]){
    const div = document.createElement('div'); div.className='chip';
    children.forEach(c => div.appendChild(c));
    this.container.appendChild(div);
    return div;
  }

  makeButton(text, title, onClick){
    const btn = document.createElement('button');
    btn.type='button'; btn.title = title||text; btn.innerHTML=text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  makeSelect(options=[], onChange){
    const sel = document.createElement('select');
    options.forEach(o => { const opt=document.createElement('option'); opt.value=o.value; opt.textContent=o.label; sel.appendChild(opt); });
    sel.addEventListener('change', e=>onChange(e.target.value));
    return sel;
  }

  build(){
    // Text styles
    const bold = this.makeButton('<b>B</b>','Bold', ()=> this.editor.exec('bold'));
    const italic = this.makeButton('<i>I</i>','Italic', ()=> this.editor.exec('italic'));
    const underline = this.makeButton('<u>U</u>','Underline', ()=> this.editor.exec('underline'));
    this.chip([bold, italic, underline]);

    // Headings
    const headingSel = this.makeSelect([{value:'p',label:'Paragraph'},{value:'h1',label:'H1'},{value:'h2',label:'H2'},{value:'h3',label:'H3'}],
      v=> this.editor.exec('formatBlock', v==='p'?'p':v)
    );

    // Font family
    const fontSel = this.makeSelect([
      {value:'Arial',label:'Arial'},
      {value:'Georgia',label:'Georgia'},
      {value:'Courier New',label:'Courier New'},
      {value:'Verdana',label:'Verdana'},
      {value:'Tahoma',label:'Tahoma'}
    ], v=> this.editor.exec('fontName', v));

    // Font size with px fix
    const sizeSel = this.makeSelect([
      {value:'12',label:'12'},
      {value:'16',label:'16'},
      {value:'20',label:'20'},
      {value:'24',label:'24'},
      {value:'28',label:'28'},
      {value:'32',label:'32'},
      {value:'36',label:'36'}
    ], v=>{
      this.editor.exec('fontSize', 7);
      const fonts = this.editor.el.querySelectorAll("font[size='7']");
      fonts.forEach(f=>{ f.removeAttribute('size'); f.style.fontSize=v+'px'; });
    });

    this.chip([headingSel, fontSel, sizeSel]);

    const left=this.makeButton('⟵','Left',()=>this.editor.exec('justifyLeft'));
    const center=this.makeButton('⇄','Center',()=>this.editor.exec('justifyCenter'));
    const right=this.makeButton('⟶','Right',()=>this.editor.exec('justifyRight'));
    const full=this.makeButton('▭','Justify',()=>this.editor.exec('justifyFull'));
    const ol=this.makeButton('1.','OL',()=>this.editor.exec('insertOrderedList'));
    const ul=this.makeButton('•','UL',()=>this.editor.exec('insertUnorderedList'));
    const indent=this.makeButton('→','Indent',()=>this.editor.exec('indent'));
    const outdent=this.makeButton('←','Outdent',()=>this.editor.exec('outdent'));
    this.chip([left, center, right, full, ol, ul, indent, outdent]);

    document.getElementById("toggleTheme").addEventListener("click", ()=>{
      document.body.classList.toggle("dark-mode");
      document.body.classList.toggle("light-mode");
      let btn=document.getElementById("toggleTheme");
      btn.textContent = document.body.classList.contains("dark-mode") ? "☀️ Light Mode" : "🌙 Dark Mode";
    });

    const colorInput=document.createElement('input'); colorInput.type='color'; colorInput.title='Text color';
    colorInput.addEventListener('input', e=> this.editor.exec('foreColor', e.target.value));
    const highlight=document.createElement('input'); highlight.type='color'; highlight.title='Highlight';
    highlight.addEventListener('input', e=>{
      try { this.editor.exec('hiliteColor', e.target.value); }
      catch(e){ this.editor.exec('backColor', e.target.value); }
    });
    this.chip([colorInput, highlight]);


    const linkBtn=this.makeButton('🔗','Insert link', ()=> this.insertLink());
    const imgBtn=this.makeButton('🖼️','Insert image', ()=> this.insertImage());
    const tableBtn=this.makeButton('▦','Insert table', ()=> this.insertTable());
    this.chip([linkBtn, imgBtn, tableBtn]);

    const copyTextBtn=this.makeButton('Txt','Copy text', ()=> navigator.clipboard.writeText(this.editor.getText()).then(()=> this.showStatus('Text copied')));
    const copyHtmlBtn=this.makeButton('< />','Copy HTML', ()=> navigator.clipboard.writeText(this.editor.getHTML()).then(()=> this.showStatus('HTML copied')));
    const previewBtn=this.makeButton('👁','Preview', ()=> this.preview());
    const clearBtn=this.makeButton('✖','Clear formatting', ()=> { this.editor.clearFormatting(); this.showStatus('Formatting cleared'); });
    this.chip([copyTextBtn, copyHtmlBtn, previewBtn, clearBtn]);

    const hint = document.createElement('div'); hint.style.color='var(--muted)'; hint.style.paddingLeft='8px'; hint.style.fontSize='12px';hint.style.color = 'darkblue';
    hint.textContent = 'Shortcuts: Ctrl/Cmd + B / I / U';
    this.container.appendChild(hint);
  }

  insertLink(){
    const url=prompt('Enter URL (https://...)');
    if(url) this.editor.exec('createLink', url);
  }

insertImage(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      this.editor.insertHTML(`
        <div contenteditable="false" 
     style=" resize:both; overflow:hidden; width:300px; height:200px;">
  <img src="${ev.target.result}" 
       style="width:100%; height:100%; object-fit:cover;">
</div>

      `);
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

  insertTable(){
    const rows=parseInt(prompt('Rows','2'))||2;
    const cols=parseInt(prompt('Cols','2'))||2;
    let html='<table>';
    for(let r=0;r<rows;r++){
      html+='<tr>'; for(let c=0;c<cols;c++) html+='<td>&nbsp;</td>'; html+='</tr>';
    }
    html+='</table><p></p>';
    this.editor.insertHTML(html);
  }

  preview(){
    const w=window.open('','_blank');
    const content=this.editor.getHTML();
    const head='<style>body{font-family:Arial;padding:20px;color:#111} table{border-collapse:collapse} td,th{border:1px solid #333;padding:8px}</style>';
    w.document.write(`<html><head>${head}<title>Preview</title></head><body>${content}</body></html>`);
    w.document.close();
  }

  bindKeyboardShortcuts(){
    document.addEventListener('keydown', e=>{
      if((e.ctrlKey||e.metaKey)&&!e.shiftKey){
        const k=e.key.toLowerCase();
        if(k==='b'){ e.preventDefault(); this.editor.exec('bold'); }
        if(k==='i'){ e.preventDefault(); this.editor.exec('italic'); }
        if(k==='u'){ e.preventDefault(); this.editor.exec('underline'); }
      }
    });
  }

  showStatus(msg){
    const st=document.getElementById('status');
    st.textContent=msg;
    setTimeout(()=> st.textContent='Ready',2200);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const editor = new Editor('editor');
  const exporter = new Exporter(editor, document.getElementById('doc-title'), document.getElementById('doc-author'));
  const toolbar = new Toolbar('toolbar', editor, exporter);

  // Restore snapshot if exists
  const snap = localStorage.getItem('assigncraft-snapshot');
  if (snap) editor.setHTML(snap);

  const statusEl = document.getElementById('status');

  // Auto-save function
  function autoSave() {
    localStorage.setItem('assigncraft-snapshot', editor.getHTML());
    statusEl.textContent = 'Autosaved ' + new Date().toLocaleTimeString();
  }

  // Save every 15 seconds
  setInterval(autoSave, 15000);

  // Save on every input/change immediately
  editor.el.addEventListener('input', autoSave);
  document.getElementById('doc-title').addEventListener('input', autoSave);
  document.getElementById('doc-author').addEventListener('input', autoSave);

  // Existing event listeners
  document.getElementById('export-doc').addEventListener('click', () => exporter.toDoc());
  document.getElementById('export-pdf').addEventListener('click', () => exporter.toPDF());
  document.getElementById('preview-btn').addEventListener('click', () => toolbar.preview());
  document.getElementById('copy-text').addEventListener('click', () => navigator.clipboard.writeText(editor.getText()).then(() => toolbar.showStatus('Text copied')));
  document.getElementById('copy-html').addEventListener('click', () => navigator.clipboard.writeText(editor.getHTML()).then(() => toolbar.showStatus('HTML copied')));
  document.getElementById('clear-format').addEventListener('click', () => { editor.clearFormatting(); toolbar.showStatus('Formatting cleared'); });
  document.getElementById('reset-editor').addEventListener('click', () => { if (confirm('Reset editor content?')) { editor.reset(); toolbar.showStatus('Reset'); } });
});


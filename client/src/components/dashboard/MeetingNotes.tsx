import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Calendar as CalendarIcon, Save, Edit2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/components/ui/utils";

// ── Load Quill from CDN (once) ────────────────────────────────────────────────
let quillLoadPromise: Promise<void> | null = null;
function loadQuill(): Promise<void> {
  if ((window as any).Quill) return Promise.resolve();
  if (quillLoadPromise) return quillLoadPromise;
  quillLoadPromise = new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      .ql-toolbar.ql-snow {
        border: none !important;
        border-bottom: 1px solid #d1d5db !important;
        background: #f3f4f6;
        padding: 6px 8px;
        flex-shrink: 0;
      }
      .ql-container.ql-snow {
        border: none !important;
        font-family: inherit;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
      }
      .ql-editor {
        padding: 16px;
        font-size: 14px;
        line-height: 1.6;
        color: #000;
        flex: 1;
        overflow-y: auto;
      }
      .ql-editor.ql-blank::before {
        font-style: normal;
        color: #9ca3af;
        left: 16px;
      }
      .ql-snow .ql-formats { margin-right: 10px !important; }
      .ql-snow .ql-picker.ql-size { width: 64px; }
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value]::before { content: attr(data-value) !important; }
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value]::before { content: attr(data-value) !important; }
      .ql-snow .ql-picker.ql-size .ql-picker-label:not([data-value])::before { content: '14px' !important; }
      .ql-snow .ql-picker.ql-size .ql-picker-item:not([data-value])::before { content: '14px' !important; }
      button.ql-undo, button.ql-redo { width: 20px !important; }
      button.ql-undo svg, button.ql-redo svg { display: none; }
      button.ql-undo::after { content: '↩'; font-size: 15px; }
      button.ql-redo::after { content: '↪'; font-size: 15px; }
    `
    document.head.appendChild(style);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return quillLoadPromise;
}

// ── Quill Editor wrapper ──────────────────────────────────────────────────────
// KEY DESIGN: This component uses `key={note.id}` from the parent, so it fully
// unmounts/remounts on note switch. That means we NEVER need to sync `value`
// back into Quill after init — we only load it once on mount. This eliminates
// the "typing corruption" bug caused by re-pasting HTML mid-keystroke.
function QuillEditor({ initialValue, onChange, placeholder }: {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(!!(window as any).Quill);

  useEffect(() => {
    if (!(window as any).Quill) loadQuill().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const Quill = (window as any).Quill;

    const Size = Quill.import("attributors/style/size");
    const SIZES = ["10px","12px","14px","16px","18px","20px","24px","28px","32px","36px","48px","72px"];
    Size.whitelist = SIZES;
    Quill.register(Size, true);

    // Clear any leftover DOM from a previous Quill instance (prevents double toolbar)
    containerRef.current.innerHTML = "";

    // Build toolbar DOM manually so "undo"/"redo" aren't registered as Quill formats
    // (Quill 1.x warns and ignores unknown format names in the container array)
    const sizeOptions = ["10px","12px","14px","16px","18px","20px","24px","28px","32px","36px","48px","72px"]
      .map(s => `<option value="${s}">${s}</option>`).join('');
    const toolbarEl = document.createElement("div");
    toolbarEl.innerHTML = `<span class="ql-formats">
        <button class="ql-undo" title="Undo"></button>
        <button class="ql-redo" title="Redo"></button>
      </span>
      <span class="ql-formats">
        <select class="ql-size">${sizeOptions}</select>
      </span>
      <span class="ql-formats">
        <button class="ql-bold"></button>
        <button class="ql-italic"></button>
        <button class="ql-underline"></button>
        <button class="ql-strike"></button>
      </span>
      <span class="ql-formats">
        <select class="ql-color"></select>
        <select class="ql-background"></select>
      </span>
      <span class="ql-formats">
        <select class="ql-align"></select>
      </span>
      <span class="ql-formats">
        <button class="ql-list" value="ordered"></button>
        <button class="ql-list" value="bullet"></button>
      </span>
      <span class="ql-formats">
        <button class="ql-link"></button>
        <button class="ql-clean"></button>
      </span>`;
    containerRef.current.appendChild(toolbarEl);

    const editorDiv = document.createElement("div");
    editorDiv.style.flex = '1';
    editorDiv.style.minHeight = '0';
    editorDiv.style.display = 'flex';
    editorDiv.style.flexDirection = 'column';
    containerRef.current.appendChild(editorDiv);

    const q = new Quill(editorDiv, {
      theme: "snow",
      placeholder: placeholder ?? "Start typing...",
      modules: {
        toolbar: {
          container: toolbarEl,
          handlers: {
            undo: () => q.history.undo(),
            redo: () => q.history.redo(),
          },
        },
        history: { delay: 400, maxStack: 500, userOnly: true },
      },
    });

    // Load initial content once
    if (initialValue) {
      q.clipboard.dangerouslyPasteHTML(initialValue);
      q.history.clear();
    }

    q.on("text-change", () => {
      const editorEl = editorDiv.querySelector(".ql-editor") as HTMLElement;
      if (!editorEl) return;
      const html = editorEl.innerHTML;
      onChange(html === "<p><br></p>" ? "" : html);
    });

    return () => {
      // Quill doesn't have a destroy method in 1.x, just let React unmount the DOM
    };
  }, [ready]);

  if (!ready) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading editor...</div>;
  }

  return <div ref={containerRef} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }} />;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Note {
  id: string;
  title: string;
  content: string;
  date: Date;
  noteTaker: string;
  type: 'note' | 'agenda';
}

// ── MeetingNotes ──────────────────────────────────────────────────────────────
export function MeetingNotes() {
  const [activeTab, setActiveTab] = useState<'notes' | 'agendas'>('notes');
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem('meetingNotes');
      if (saved) return JSON.parse(saved).map((n: any) => ({ ...n, date: new Date(n.date) }));
    } catch {}
    return [{
      id: '1',
      title: format(new Date(), 'MMMM d, yyyy'),
      content: '<p>Planned Outreach Events:</p><ul><li>Spring Welcome Week</li><li>Resource Fair</li></ul>',
      date: new Date(),
      noteTaker: '',
      type: 'note',
    }];
  });

  const [activeNoteId, setActiveNoteId] = useState<string | null>('1');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditMetadataOpen, setIsEditMetadataOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEditCalendarOpen, setIsEditCalendarOpen] = useState(false);

  const [newNoteDate, setNewNoteDate] = useState<Date>(new Date());
  const [newNoteTaker, setNewNoteTaker] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');

  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editNoteTaker, setEditNoteTaker] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const quillRef = useRef<any>(null); // kept for legacy, no longer used by editor

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      setSidebarWidth(Math.min(500, Math.max(160, startW.current + (e.clientX - startX.current))));
    };
    const onUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  useEffect(() => {
    localStorage.setItem('meetingNotes', JSON.stringify(notes));
  }, [notes]);

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
  };

  const activeNote = notes.find(n => n.id === activeNoteId);
  const filteredNotes = notes
    .filter(n => n.type === (activeTab === 'notes' ? 'note' : 'agenda'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddNote = () => {
    const title = newNoteTitle.trim() || format(newNoteDate, 'MMMM d, yyyy');
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      content: '',
      date: newNoteDate,
      noteTaker: newNoteTaker,
      type: activeTab === 'notes' ? 'note' : 'agenda',
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setNewNoteDate(new Date());
    setNewNoteTaker('');
    setNewNoteTitle('');
    setIsAddDialogOpen(false);
    toast.success(`New ${activeTab === 'notes' ? 'note' : 'agenda'} created`);
  };

  const handleUpdateNote = useCallback((content: string) => {
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content } : n));
  }, [activeNoteId]);

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(notes.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(notes.find(n => n.id !== id)?.id || null);
    }
    toast.success("Note deleted");
  };

  const openEditMetadata = () => {
    if (activeNote) {
      setEditDate(activeNote.date);
      setEditNoteTaker(activeNote.noteTaker);
      setEditTitle(activeNote.title);
      setIsEditMetadataOpen(true);
    }
  };

  const handleSaveMetadata = () => {
    const title = editTitle.trim() || format(editDate, 'MMMM d, yyyy');
    setNotes(notes.map(n =>
      n.id === activeNoteId ? { ...n, title, date: editDate, noteTaker: editNoteTaker } : n
    ));
    setIsEditMetadataOpen(false);
    toast.success("Meeting details updated");
  };

  const handleSaveAs = async (type: 'docx' | 'pdf') => {
    if (!activeNote) return;
    const title = activeNote.title;
    const html = activeNote.content || '<p></p>';
    const meta = format(activeNote.date, 'PPPP') + (activeNote.noteTaker ? ' · ' + activeNote.noteTaker : '');

    // Full HTML document with Quill styles so formatting is preserved
    const fullHtml = `<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>${title}</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css"/>
      <style>
        body { font-family: Arial, sans-serif; font-size: 14px; margin: 48px; color: #111; max-width: 800px; }
        h1.doc-title { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
        p.doc-meta { color: #666; font-size: 12px; margin: 0 0 24px; }
        .ql-editor { padding: 0; }
        .ql-container { border: none; }
        @media print {
          body { margin: 0; }
          @page { margin: 2cm; }
        }
      </style>
    </head><body>
      <h1 class="doc-title">${title}</h1>
      <p class="doc-meta">${meta}</p>
      <div class="ql-editor">${html}</div>
    </body></html>`;

    if (type === 'pdf') {
      const win = window.open('', '_blank');
      if (!win) { toast.error("Popup blocked — please allow popups and try again."); return; }
      win.document.write(fullHtml);
      win.document.close();
      win.focus();
      // Wait for Quill CSS to load before printing
      setTimeout(() => { win.print(); }, 800);
      return;
    }

    if (type === 'docx') {
      try {
        // Load JSZip from cdnjs to build the .docx ZIP structure
        if (!(window as any).JSZip) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load JSZip'));
            document.head.appendChild(s);
          });
        }

        // Parse Quill HTML into Word XML runs, preserving bold/italic/underline/color/size
        const parseHtmlToWordXml = (htmlStr: string): string => {
          const tmp = document.createElement('div');
          tmp.innerHTML = htmlStr;
          let xml = '';

          const escXml = (t: string) => t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

          const runFromSpan = (el: Element): string => {
            const style = (el as HTMLElement).style;
            const text = escXml(el.textContent || '');
            if (!text) return '';
            let rpr = '';
            if (style.fontWeight === 'bold' || el.closest('strong, b')) rpr += '<w:b/>';
            if (style.fontStyle === 'italic' || el.closest('em, i')) rpr += '<w:i/>';
            if (style.textDecoration?.includes('underline') || el.closest('u')) rpr += '<w:u w:val="single"/>';
            if (style.fontSize) {
              const px = parseFloat(style.fontSize);
              const halfPt = Math.round(px * 1.5);
              rpr += `<w:sz w:val="${halfPt}"/><w:szCs w:val="${halfPt}"/>`;
            }
            if (style.color && style.color !== 'rgb(0, 0, 0)') {
              const hex = style.color.match(/\d+/g)?.map((n:string) => parseInt(n).toString(16).padStart(2,'0')).join('') || '000000';
              rpr += `<w:color w:val="${hex}"/>`;
            }
            return `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${text}</w:t></w:r>`;
          };

          const nodeToParagraph = (el: Element, isList = false, listChar = '•'): string => {
            let runs = '';
            const walk = (node: Node) => {
              if (node.nodeType === 3) {
                const t = escXml(node.textContent || '');
                if (t) runs += `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`;
              } else if (node.nodeType === 1) {
                const tag = (node as Element).tagName.toLowerCase();
                const style = (node as HTMLElement).style;
                let rpr = '';
                if (tag === 'strong' || tag === 'b') rpr += '<w:b/>';
                if (tag === 'em' || tag === 'i') rpr += '<w:i/>';
                if (tag === 'u') rpr += '<w:u w:val="single"/>';
                if (tag === 's' || tag === 'strike') rpr += '<w:strike/>';
                if (style?.fontSize) {
                  const px = parseFloat(style.fontSize);
                  const halfPt = Math.round(px * 1.5);
                  rpr += `<w:sz w:val="${halfPt}"/><w:szCs w:val="${halfPt}"/>`;
                }
                if (style?.color && style.color !== 'rgb(0, 0, 0)' && style.color !== '') {
                  const m = style.color.match(/\d+/g);
                  if (m) { const hex = m.map((n:string)=>parseInt(n).toString(16).padStart(2,'0')).join(''); rpr += `<w:color w:val="${hex}"/>`; }
                }
                if (rpr && node.textContent) {
                  const t = escXml(node.textContent);
                  runs += `<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${t}</w:t></w:r>`;
                } else {
                  node.childNodes.forEach(walk);
                }
              }
            };
            if (isList) runs += `<w:r><w:t xml:space="preserve">${listChar}\t</w:t></w:r>`;
            el.childNodes.forEach(walk);
            return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>${runs}</w:p>`;
          };

          const walk = (el: Element) => {
            const tag = el.tagName?.toLowerCase();
            if (!tag) return;
            if (tag === 'p' || tag === 'div') { xml += nodeToParagraph(el); }
            else if (tag === 'h1') { xml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escXml(el.textContent||'')}</w:t></w:r></w:p>`; }
            else if (tag === 'h2') { xml += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${escXml(el.textContent||'')}</w:t></w:r></w:p>`; }
            else if (tag === 'ul') { el.querySelectorAll('li').forEach(li => { xml += nodeToParagraph(li, true, '•'); }); }
            else if (tag === 'ol') { let n=1; el.querySelectorAll('li').forEach(li => { xml += nodeToParagraph(li, true, `${n++}.`); }); }
            else if (tag === 'br') { xml += '<w:p/>'; }
          };

          Array.from(tmp.children).forEach(walk);
          return xml;
        };

        const bodyXml = `
          <w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr><w:t>${title.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</w:t></w:r>
          </w:p>
          <w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:color w:val="666666"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${meta.replace(/&/g,'&amp;')}</w:t></w:r>
          </w:p>
          <w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>
          ${parseHtmlToWordXml(html)}`;

        const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`;

        const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

        const wordRelsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

        const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

        const JSZip = (window as any).JSZip;
        const zip = new JSZip();
        zip.file('[Content_Types].xml', contentTypesXml);
        zip.file('_rels/.rels', relsXml);
        zip.file('word/document.xml', docXml);
        zip.file('word/_rels/document.xml.rels', wordRelsXml);

        const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.docx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Saved as Word document');
      } catch (e) {
        toast.error('Failed to export — check console for details');
        console.error(e);
      }
    }
  };




  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Meeting Notes and Agendas</h2>

      <div className="flex space-x-2 border-b">
        {(['notes', 'agendas'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setActiveNoteId(null); }}
            className={cn("px-4 py-2 font-medium", activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground")}
          >
            {tab === 'notes' ? 'Notes' : 'Agendas'}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden gap-1">
        {/* Sidebar */}
        <Card className="flex flex-col h-full overflow-hidden flex-shrink-0" style={{ width: sidebarWidth }}>
          <div style={{padding: "16px 12px 8px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <div>
              <p className="text-sm font-semibold">{activeTab === 'notes' ? 'All Notes' : 'All Agendas'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredNotes.length} {activeTab === 'notes' ? 'note' : 'agenda'}{filteredNotes.length !== 1 ? 's' : ''}</p>
            </div>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              New
            </Button>
          </div>
          <CardContent className="flex-1 overflow-hidden p-0 pt-2">
            <ScrollArea className="h-full">
              <div className="space-y-1 px-2">
                {filteredNotes.map(note => (
                  <div key={note.id} onClick={() => handleSelectNote(note.id)}
                    className={`p-3 rounded-md cursor-pointer flex justify-between items-start group hover:bg-accent ${activeNoteId === note.id ? 'bg-accent' : ''}`}
                  >
                    <div className="overflow-hidden flex-1 min-w-0">
                      <p className="font-medium truncate">{note.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0" />
                        {format(note.date, 'MMM d, yyyy')}
                      </p>
                      {note.noteTaker && <p className="text-xs text-muted-foreground mt-1">By {note.noteTaker}</p>}
                    </div>
                    <Button variant="ghost" size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={(e) => handleDeleteNote(note.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {filteredNotes.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No {activeTab === 'notes' ? 'notes' : 'agendas'} yet. Click "New {activeTab === 'notes' ? 'Note' : 'Agenda'}" to create one.
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Drag handle */}
        <div
          className="w-2 flex-shrink-0 flex items-center justify-center cursor-col-resize group"
          onMouseDown={(e) => {
            isResizing.current = true;
            startX.current = e.clientX;
            startW.current = sidebarWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        >
          <div className="w-0.5 h-12 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
        </div>

        {/* Editor */}
        <div className="flex flex-col h-full overflow-hidden flex-1 rounded-lg border bg-card shadow-sm">
          {activeNote ? (
            <>
              <div style={{padding: "16px 24px 12px", flexShrink: 0, borderBottom: "1px solid hsl(var(--border))"}}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-xl leading-tight tracking-tight">{activeNote.title}</p>
                    <p className="text-sm text-muted-foreground" style={{marginTop: "8px"}}>{format(activeNote.date, 'PPPP')}</p>
                    {activeNote.noteTaker && <p className="text-sm text-muted-foreground" style={{marginTop: "2px"}}>Note taker: {activeNote.noteTaker}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={openEditMetadata}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Save className="mr-2 h-4 w-4" /> Save As <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSaveAs('docx')}>
                          Save as Word (.docx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSaveAs('pdf')}>
                          Save as PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              <div style={{flex: 1, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column"}}>
                <QuillEditor
                  key={activeNote.id}
                  initialValue={activeNote.content}
                  onChange={handleUpdateNote}
                  placeholder="Type your meeting notes here..."
                />
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select or create a note to start editing.
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isAddDialogOpen && (
        <div style={{position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}
          onClick={() => setIsAddDialogOpen(false)}>
          <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)'}} />
          <div style={{position: 'relative', background: 'white', borderRadius: '12px', padding: '24px', width: '425px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}
            onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{fontSize: '18px', fontWeight: 600, margin: 0}}>Create New {activeTab === 'notes' ? 'Note' : 'Agenda'}</h2>
              <button onClick={() => setIsAddDialogOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#666', lineHeight: 1}}>✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Meeting Date *</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newNoteDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newNoteDate ? format(newNoteDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newNoteDate}
                      onSelect={(date) => { if (date) setNewNoteDate(date); setIsCalendarOpen(false); }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newTitle">Title <span className="text-muted-foreground font-normal text-xs">(optional — defaults to date)</span></Label>
                <Input id="newTitle" placeholder={format(newNoteDate, 'MMMM d, yyyy')} value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="noteTaker">Note Taker</Label>
                <Input id="noteTaker" placeholder="Enter your name" value={newNoteTaker} onChange={(e) => setNewNoteTaker(e.target.value)} />
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px'}}>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddNote}>Create {activeTab === 'notes' ? 'Note' : 'Agenda'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {isEditMetadataOpen && (
        <div style={{position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}
          onClick={() => setIsEditMetadataOpen(false)}>
          <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)'}} />
          <div style={{position: 'relative', background: 'white', borderRadius: '12px', padding: '24px', width: '425px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}
            onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{fontSize: '18px', fontWeight: 600, margin: 0}}>Edit Meeting Details</h2>
              <button onClick={() => setIsEditMetadataOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#666', lineHeight: 1}}>✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Meeting Date *</Label>
                <Popover open={isEditCalendarOpen} onOpenChange={setIsEditCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={editDate}
                      onSelect={(date) => { if (date) setEditDate(date); setIsEditCalendarOpen(false); }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="editTitle">Title <span className="text-muted-foreground font-normal text-xs">(optional — defaults to date)</span></Label>
                <Input id="editTitle" placeholder={format(editDate, 'MMMM d, yyyy')} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="editNoteTaker">Note Taker</Label>
                <Input id="editNoteTaker" placeholder="e.g., Samridhi" value={editNoteTaker} onChange={(e) => setEditNoteTaker(e.target.value)} />
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px'}}>
              <Button variant="outline" onClick={() => setIsEditMetadataOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveMetadata}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
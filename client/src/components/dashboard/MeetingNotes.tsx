import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Calendar as CalendarIcon, Save, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/components/ui/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Note {
  id: string;
  title: string;
  content: string;
  date: Date;
  noteTaker: string;
  type: 'note' | 'agenda';
}

export function MeetingNotes() {
  const [activeTab, setActiveTab] = useState<'notes' | 'agendas'>('notes');
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('meetingNotes');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert date strings back to Date objects
      return parsed.map((note: any) => ({
        ...note,
        date: new Date(note.date)
      }));
    }
    return [
      { 
        id: '1', 
        title: format(new Date(), 'MMMM d, yyyy'),
        content: 'Planned Outreach Events:\n- Spring Welcome Week\n- Resource Fair', 
        date: new Date(),
        noteTaker: '',
        type: 'note'
      },
    ];
  });
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>('1');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditMetadataOpen, setIsEditMetadataOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // New note form state
  const [newNoteDate, setNewNoteDate] = useState<Date>(new Date());
  const [newNoteTaker, setNewNoteTaker] = useState('');
  
  // Edit metadata state
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editNoteTaker, setEditNoteTaker] = useState('');

  // Save to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem('meetingNotes', JSON.stringify(notes));
  }, [notes]);

  const activeNote = notes.find(n => n.id === activeNoteId);
  const filteredNotes = notes.filter(n => n.type === (activeTab === 'notes' ? 'note' : 'agenda'));

  const handleAddNote = () => {
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: format(newNoteDate, 'MMMM d, yyyy'),
      content: '',
      date: newNoteDate,
      noteTaker: newNoteTaker,
      type: activeTab === 'notes' ? 'note' : 'agenda'
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    
    // Reset form
    setNewNoteDate(new Date());
    setNewNoteTaker('');
    setIsAddDialogOpen(false);
    
    toast.success(`New ${activeTab === 'notes' ? 'note' : 'agenda'} created`);
  };

  const handleUpdateNote = (content: string) => {
    setNotes(notes.map(n => n.id === activeNoteId ? { ...n, content } : n));
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(notes.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(notes.length > 1 ? notes.find(n => n.id !== id)?.id || null : null);
    }
    toast.success("Note deleted");
  };

  const openEditMetadata = () => {
    if (activeNote) {
      setEditDate(activeNote.date);
      setEditNoteTaker(activeNote.noteTaker);
      setIsEditMetadataOpen(true);
    }
  };

  const handleSaveMetadata = () => {
    setNotes(notes.map(n => 
      n.id === activeNoteId 
        ? { ...n, title: format(editDate, 'MMMM d, yyyy'), date: editDate, noteTaker: editNoteTaker }
        : n
    ));
    setIsEditMetadataOpen(false);
    toast.success("Meeting details updated");
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Meeting Notes and Agendas</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New {activeTab === 'notes' ? 'Note' : 'Agenda'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => {
            setActiveTab('notes');
            setActiveNoteId(null);
          }}
          className={cn(
            "px-4 py-2 font-medium",
            activeTab === 'notes' ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
          )}
        >
          Notes
        </button>
        <button
          onClick={() => {
            setActiveTab('agendas');
            setActiveNoteId(null);
          }}
          className={cn(
            "px-4 py-2 font-medium",
            activeTab === 'agendas' ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
          )}
        >
          Agendas
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
        {/* Sidebar List */}
        <Card className="flex flex-col h-full col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{activeTab === 'notes' ? 'All Notes' : 'All Agendas'}</CardTitle>
            <CardDescription className="text-xs">{filteredNotes.length} {activeTab === 'notes' ? 'note' : 'agenda'}{filteredNotes.length !== 1 ? 's' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 pt-2">
             <ScrollArea className="h-full">
               <div className="space-y-1 px-2">
                 {filteredNotes.map(note => (
                   <div 
                     key={note.id}
                     onClick={() => setActiveNoteId(note.id)}
                     className={`p-3 rounded-md cursor-pointer flex justify-between items-start group hover:bg-accent ${activeNoteId === note.id ? 'bg-accent' : ''}`}
                   >
                     <div className="overflow-hidden flex-1">
                       <p className="font-medium truncate">{note.title}</p>
                       <p className="text-xs text-muted-foreground flex items-center mt-1">
                         <CalendarIcon className="mr-1 h-3 w-3" />
                         {format(note.date, 'MMM d, yyyy')}
                       </p>
                       {note.noteTaker && (
                         <p className="text-xs text-muted-foreground mt-1">
                           By {note.noteTaker}
                         </p>
                       )}
                     </div>
                     <Button 
                       variant="ghost" 
                       size="icon" 
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

        {/* Editor */}
        <Card className="flex flex-col h-full col-span-1 md:col-span-2">
          {activeNote ? (
            <>
              <CardHeader className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle>{activeNote.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {format(activeNote.date, 'PPPP')}
                    </CardDescription>
                    {activeNote.noteTaker && (
                      <CardDescription className="mt-1">
                        Note taker: {activeNote.noteTaker}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={openEditMetadata}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.success("Saved")}>
                      <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <Textarea 
                  className="h-full w-full resize-none border-0 focus-visible:ring-0 p-6 text-base leading-relaxed"
                  placeholder="Type your meeting notes here..."
                  value={activeNote.content}
                  onChange={(e) => handleUpdateNote(e.target.value)}
                />
              </CardContent>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select or create a note to start editing.
            </div>
          )}
        </Card>
      </div>

      {/* Add Meeting Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New {activeTab === 'notes' ? 'Note' : 'Agenda'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Meeting Date *</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newNoteDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newNoteDate ? format(newNoteDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newNoteDate}
                    onSelect={(date) => {
                      if (date) setNewNoteDate(date);
                      setIsCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="noteTaker">Note Taker</Label>
              <Input
                id="noteTaker"
                placeholder="Enter your name"
                value={newNoteTaker}
                onChange={(e) => setNewNoteTaker(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNote}>Create {activeTab === 'notes' ? 'Note' : 'Agenda'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Metadata Dialog */}
      <Dialog open={isEditMetadataOpen} onOpenChange={setIsEditMetadataOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Meeting Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Meeting Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editDate}
                    onSelect={(date) => {
                      if (date) setEditDate(date);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editNoteTaker">Note Taker</Label>
              <Input
                id="editNoteTaker"
                placeholder="e.g., Samridhi"
                value={editNoteTaker}
                onChange={(e) => setEditNoteTaker(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMetadataOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMetadata}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
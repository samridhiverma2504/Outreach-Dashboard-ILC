import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, CalendarIcon, Edit, Undo, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/components/ui/utils";

type RequestStatus = "pending" | "submitted" | "n/a";
type EventSource = "tabling" | "presentations";

interface TablingEvent {
  id: string;
  name: string;
  date: Date | undefined;
  startTime: string;
  endTime: string;
  location: string;
  staff: string[];
  spaceStatus: RequestStatus;
  cateringStatus: RequestStatus;
  notes: string;
}

interface PresentationEvent {
  id: string;
  course: string;
  instructorName: string;
  instructorEmail: string;
  date: Date | undefined;
  time: string;
  location: string;
  staff: string[];
  notes: string;
}

interface CompletedEvent {
  id: string;
  name: string;
  date: Date | undefined;
  time: string;
  location: string;
  interacted: number | "";
  source: EventSource;
  notes: string;
  originalEvent: TablingEvent | PresentationEvent;
}

const formatTimeInput = (input: string): string => {
  if (!input) return "";
  let cleaned = input.replace(/[^0-9:]/g, '');
  if (cleaned.length === 0) return "";
  if (!cleaned.includes(':')) {
    if (cleaned.length <= 2) return cleaned;
    else if (cleaned.length === 3) return cleaned.slice(0, 1) + ':' + cleaned.slice(1);
    else if (cleaned.length >= 4) return cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
  }
  const parts = cleaned.split(':');
  if (parts.length >= 2) {
    const hours = parts[0].slice(0, 2);
    const minutes = parts[1].slice(0, 2);
    return hours + (minutes ? ':' + minutes : '');
  }
  return cleaned;
};

const ensureAMPM = (timeStr: string): string => {
  if (!timeStr) return "";
  const upper = timeStr.toUpperCase().trim();
  if (upper.includes('AM') || upper.includes('PM')) return timeStr.trim();
  const timePart = formatTimeInput(timeStr);
  if (!timePart) return timeStr;
  const hourMatch = timePart.match(/^(\d{1,2})/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1]);
    if (hour >= 9 && hour <= 23) return timePart + ' PM';
    else if (hour >= 1 && hour <= 8) return timePart + ' AM';
    else return timePart + ' PM';
  }
  return timeStr;
};

export function ReservationTracker({ onNavigateToEmailGenerator }) {
  const [activeTab, setActiveTab] = useState<"tabling" | "presentations" | "completed">("tabling");

  const [tablingEvents, setTablingEvents] = useState<TablingEvent[]>(() => {
    const saved = localStorage.getItem('tablingEvents');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((event: any) => ({
        ...event,
        date: event.date ? new Date(event.date) : undefined,
        notes: event.notes || ""
      }));
    }
    return [{
      id: "sample1", name: "Tabling", date: new Date(),
      startTime: "11:00 AM", endTime: "2:00 PM", location: "Illini Union",
      staff: ["Aniya", "Jenna", "Samridhi", "Taya", "Vaanathi"],
      spaceStatus: "submitted", cateringStatus: "pending", notes: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    }];
  });

  const [presentationEvents, setPresentationEvents] = useState<PresentationEvent[]>(() => {
    const saved = localStorage.getItem('presentationEvents');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((event: any) => ({
        ...event,
        date: event.date ? new Date(event.date) : undefined,
        notes: event.notes || ""
      }));
    }
    return [{
      id: "sample2", course: "LEAD 260", instructorName: "Jennifer Smist",
      instructorEmail: "jsmist@illinois.edu", date: new Date(),
      time: "11:00 AM", location: "103 Bevier Hall", staff: ["Samridhi"], notes: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    }];
  });

  const [completedEvents, setCompletedEvents] = useState<CompletedEvent[]>(() => {
    const saved = localStorage.getItem('completedEvents');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((event: any) => ({
        ...event,
        date: event.date ? new Date(event.date) : undefined,
        notes: event.notes || "",
        originalEvent: {
          ...event.originalEvent,
          date: event.originalEvent.date ? new Date(event.originalEvent.date) : undefined,
          notes: event.originalEvent.notes || ""
        }
      }));
    }
    return [];
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TablingEvent | PresentationEvent | CompletedEvent | null>(null);
  const [completedEventSource, setCompletedEventSource] = useState<EventSource>("tabling");

  const [newTablingEvent, setNewTablingEvent] = useState<Partial<TablingEvent>>({
    name: "", date: undefined, startTime: "", endTime: "", location: "",
    staff: [], spaceStatus: "pending", cateringStatus: "pending", notes: "",
  });
  const [newPresentationEvent, setNewPresentationEvent] = useState<Partial<PresentationEvent>>({
    course: "", instructorName: "", instructorEmail: "", date: undefined,
    time: "", location: "", staff: [], notes: "",
  });
  const [newCompletedEvent, setNewCompletedEvent] = useState<Partial<CompletedEvent>>({
    name: "", date: undefined, time: "", location: "", interacted: "", notes: "",
  });

  useEffect(() => { localStorage.setItem('tablingEvents', JSON.stringify(tablingEvents)); }, [tablingEvents]);
  useEffect(() => { localStorage.setItem('presentationEvents', JSON.stringify(presentationEvents)); }, [presentationEvents]);
  useEffect(() => { localStorage.setItem('completedEvents', JSON.stringify(completedEvents)); }, [completedEvents]);

  const resetNewEvents = () => {
    setNewTablingEvent({ name: "", date: undefined, startTime: "", endTime: "", location: "", staff: [], spaceStatus: "pending", cateringStatus: "pending", notes: "" });
    setNewPresentationEvent({ course: "", instructorName: "", instructorEmail: "", date: undefined, time: "", location: "", staff: [], notes: "" });
    setNewCompletedEvent({ name: "", date: undefined, time: "", location: "", interacted: "", notes: "" });
    setCompletedEventSource("tabling");
  };

  const handleAddOrEditEvent = () => {
    if (activeTab === "tabling") {
      if (!newTablingEvent.name || !newTablingEvent.date || !newTablingEvent.startTime || !newTablingEvent.endTime || !newTablingEvent.location) {
        toast.error("Please fill all required fields."); return;
      }
      const s = ensureAMPM(newTablingEvent.startTime);
      const e = ensureAMPM(newTablingEvent.endTime);
      if (editingEvent) {
        const list = [...tablingEvents];
        const idx = list.findIndex(x => x.id === editingEvent.id);
        if (idx !== -1) list[idx] = { ...(newTablingEvent as TablingEvent), id: editingEvent.id, startTime: s, endTime: e };
        setTablingEvents(list); setEditingEvent(null); toast.success("Event updated");
      } else {
        setTablingEvents([...tablingEvents, { ...(newTablingEvent as TablingEvent), id: Math.random().toString(36).substr(2, 9), startTime: s, endTime: e }]);
        toast.success("Event added");
      }
    } else if (activeTab === "presentations") {
      if (!newPresentationEvent.course || !newPresentationEvent.instructorName || !newPresentationEvent.instructorEmail || !newPresentationEvent.date || !newPresentationEvent.time || !newPresentationEvent.location) {
        toast.error("Please fill all required fields."); return;
      }
      const t = ensureAMPM(newPresentationEvent.time);
      if (editingEvent) {
        const list = [...presentationEvents];
        const idx = list.findIndex(x => x.id === editingEvent.id);
        if (idx !== -1) list[idx] = { ...(newPresentationEvent as PresentationEvent), id: editingEvent.id, time: t };
        setPresentationEvents(list); setEditingEvent(null); toast.success("Event updated");
      } else {
        setPresentationEvents([...presentationEvents, { ...(newPresentationEvent as PresentationEvent), id: Math.random().toString(36).substr(2, 9), time: t }]);
        toast.success("Event added");
      }
    } else if (activeTab === "completed") {
      if (!newCompletedEvent.name || !newCompletedEvent.date || !newCompletedEvent.location) {
        toast.error("Please fill all required fields."); return;
      }
      if (!editingEvent) {
        if (completedEventSource === "tabling" && (!newTablingEvent.startTime || !newTablingEvent.endTime)) { toast.error("Please fill all required fields."); return; }
        if (completedEventSource === "presentations" && !newPresentationEvent.time) { toast.error("Please fill all required fields."); return; }
      } else {
        if (!newCompletedEvent.time) { toast.error("Please fill all required fields."); return; }
      }
      if (editingEvent) {
        const list = [...completedEvents];
        const idx = list.findIndex(x => x.id === (editingEvent as CompletedEvent).id);
        if (idx !== -1) list[idx] = { ...list[idx], name: newCompletedEvent.name!, date: newCompletedEvent.date, time: newCompletedEvent.time!, location: newCompletedEvent.location!, interacted: newCompletedEvent.interacted === "" ? "" : (newCompletedEvent.interacted || ""), notes: newCompletedEvent.notes || "" };
        setCompletedEvents(list); setEditingEvent(null); toast.success("Event updated");
      } else {
        let originalEvent: TablingEvent | PresentationEvent;
        if (completedEventSource === "tabling") {
          originalEvent = { id: Math.random().toString(36).substr(2, 9), name: newCompletedEvent.name!, date: newCompletedEvent.date, startTime: ensureAMPM(newTablingEvent.startTime || ""), endTime: ensureAMPM(newTablingEvent.endTime || ""), location: newCompletedEvent.location!, staff: newTablingEvent.staff || [], spaceStatus: newTablingEvent.spaceStatus || "pending", cateringStatus: newTablingEvent.cateringStatus || "pending", notes: newTablingEvent.notes || "" } as TablingEvent;
        } else {
          originalEvent = { id: Math.random().toString(36).substr(2, 9), course: newCompletedEvent.name!, instructorName: newPresentationEvent.instructorName || "", instructorEmail: newPresentationEvent.instructorEmail || "", date: newCompletedEvent.date, time: ensureAMPM(newPresentationEvent.time || ""), location: newCompletedEvent.location!, staff: newPresentationEvent.staff || [], notes: newPresentationEvent.notes || "" } as PresentationEvent;
        }
        setCompletedEvents([...completedEvents, { id: originalEvent.id, name: newCompletedEvent.name!, date: newCompletedEvent.date, time: completedEventSource === "tabling" ? `${ensureAMPM(newTablingEvent.startTime || "")} - ${ensureAMPM(newTablingEvent.endTime || "")}` : ensureAMPM(newPresentationEvent.time || ""), location: newCompletedEvent.location!, interacted: newCompletedEvent.interacted === "" ? "" : (newCompletedEvent.interacted || ""), source: completedEventSource, notes: newCompletedEvent.notes || "", originalEvent }]);
        toast.success("Completed event added");
      }
    }
    resetNewEvents();
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (activeTab === "tabling") setTablingEvents(tablingEvents.filter(e => e.id !== id));
    if (activeTab === "presentations") setPresentationEvents(presentationEvents.filter(e => e.id !== id));
    if (activeTab === "completed") setCompletedEvents(completedEvents.filter(e => e.id !== id));
    toast.success("Event deleted");
  };

  const handleDuplicate = (event: TablingEvent | PresentationEvent | CompletedEvent) => {
    const newId = Math.random().toString(36).substr(2, 9);
    if (activeTab === "tabling") setTablingEvents([...tablingEvents, { ...(event as TablingEvent), id: newId }]);
    else if (activeTab === "presentations") setPresentationEvents([...presentationEvents, { ...(event as PresentationEvent), id: newId }]);
    else { const o = event as CompletedEvent; setCompletedEvents([...completedEvents, { ...o, id: newId, originalEvent: { ...o.originalEvent, id: newId } }]); }
    toast.success("Event duplicated");
  };

  // Updated pendingComplete to include notes
  const [pendingComplete, setPendingComplete] = useState<{ event: TablingEvent | PresentationEvent, interacted: number | "", notes: string } | null>(null);

  const handleMarkComplete = (event: TablingEvent | PresentationEvent) => {
    setPendingComplete({ event, interacted: "", notes: "" });
  };

  const confirmMarkComplete = () => {
    if (!pendingComplete) return;
    const { event, interacted, notes } = pendingComplete;
    if (activeTab === "tabling" || event.hasOwnProperty("startTime")) {
      const e = event as TablingEvent;
      setTablingEvents(tablingEvents.filter(x => x.id !== e.id));
      setCompletedEvents([...completedEvents, { id: e.id, name: e.name, date: e.date, time: `${e.startTime} - ${e.endTime}`, location: e.location, interacted, source: "tabling", notes, originalEvent: e }]);
    } else {
      const e = event as PresentationEvent;
      setPresentationEvents(presentationEvents.filter(x => x.id !== e.id));
      setCompletedEvents([...completedEvents, { id: e.id, name: e.course, date: e.date, time: e.time, location: e.location, interacted, source: "presentations", notes, originalEvent: e }]);
    }
    setPendingComplete(null);
    toast.success("Event marked as complete");
  };

  const handleMarkIncomplete = (event: CompletedEvent) => {
    setCompletedEvents(completedEvents.filter(e => e.id !== event.id));
    if (event.source === "tabling") setTablingEvents([...tablingEvents, event.originalEvent as TablingEvent]);
    else setPresentationEvents([...presentationEvents, event.originalEvent as PresentationEvent]);
    toast.success("Event marked as incomplete");
  };

  const updateCompletedInteracted = (id: string, value: number | "") => {
    setCompletedEvents(completedEvents.map(e => e.id === id ? { ...e, interacted: value } : e));
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case "pending": return { backgroundColor: "#e8e5c3", color: "#111" };
      case "submitted": return { backgroundColor: "#1a7e62", color: "#111" };
      case "n/a": return { backgroundColor: "#f3f3f5", color: "#111" };
      default: return {};
    }
  };

  const openAddDialog = () => { setEditingEvent(null); resetNewEvents(); setIsDialogOpen(true); };

  const statusColStyle: React.CSSProperties = { minWidth: "140px", width: "140px", textAlign: "center" };
  const notesColStyle: React.CSSProperties = { minWidth: "280px", width: "280px" };
  const notesCellStyle: React.CSSProperties = { minWidth: "280px", width: "280px", whiteSpace: "normal", wordBreak: "normal", overflowWrap: "break-word", verticalAlign: "top", padding: "8px 12px" };
  const topCell: React.CSSProperties = { verticalAlign: "top" };

  const taStyle = "col-span-3 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
      <style>{`
        thead tr th { padding-top: 14px !important; padding-bottom: 14px !important; }
        #event-tracker-card { gap: 0 !important; }
        #event-tracker-card > div:last-child { padding-top: 0 !important; }
      `}</style>
      <h2 className="text-2xl font-bold tracking-tight" style={{ marginBottom: "20px" }}>Event Tracker</h2>

      {/* Tabs */}
      <div className="flex space-x-2 border-b" style={{ marginBottom: "16px" }}>
        {["tabling", "presentations", "completed"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={cn("px-4 py-2 font-medium", activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground")}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card id="event-tracker-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", padding: "12px 24px 12px 24px" }}>
          <CardTitle>
            {activeTab === "tabling" ? "Tabling Events" : activeTab === "presentations" ? "Presentations" : "Completed Events"}
          </CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            {activeTab === "tabling" && (<>
              <Button variant="outline" onClick={() => window.open("https://illiniunion.illinois.edu/EventServices/SubmitRequest.aspx", "_blank")}>Reserve Space</Button>
              <Button variant="outline" onClick={() => onNavigateToEmailGenerator?.('catering')}>Email Catering</Button>
              <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" />Add Event</Button>
            </>)}
            {activeTab === "presentations" && (<>
              <Button variant="outline" onClick={() => onNavigateToEmailGenerator?.('presentations')}>Email Instructor</Button>
              <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" />Add Event</Button>
            </>)}
            {activeTab === "completed" && (<>
              <Button variant="outline" className="pointer-events-none">
                Total # Interacted: {completedEvents.reduce((sum, e) => sum + (typeof e.interacted === 'number' ? e.interacted : 0), 0)}
              </Button>
              <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" />Add Event</Button>
            </>)}
          </div>
        </div>
        <div style={{ borderTop: "1px solid hsl(var(--border))", padding: "0 24px 16px 24px" }}>
          <Table>
            <TableHeader>
              <TableRow>
                {activeTab === "tabling" && (<>
                  <TableHead>Event Name</TableHead>
                  <TableHead className="text-center">Date</TableHead>
                  <TableHead className="text-center">Start</TableHead>
                  <TableHead className="text-center">End</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-center" style={statusColStyle}>Space Status</TableHead>
                  <TableHead className="text-center" style={statusColStyle}>Catering Status</TableHead>
                  <TableHead style={notesColStyle}>Notes</TableHead>
                  <TableHead className="text-center">Complete</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </>)}
                {activeTab === "presentations" && (<>
                  <TableHead>Course</TableHead>
                  <TableHead>Instructor Name</TableHead>
                  <TableHead>Instructor Email</TableHead>
                  <TableHead className="text-center">Date</TableHead>
                  <TableHead className="text-center">Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead style={notesColStyle}>Notes</TableHead>
                  <TableHead className="text-center">Complete</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </>)}
                {activeTab === "completed" && (<>
                  <TableHead>Event Name</TableHead>
                  <TableHead className="text-center">Event Type</TableHead>
                  <TableHead className="text-center">Date</TableHead>
                  <TableHead className="text-center">Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center"># Interacted</TableHead>
                  <TableHead style={notesColStyle}>Notes</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTab === "tabling" && (
                tablingEvents.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No events yet. Click "Add Event" to get started.</TableCell></TableRow>
                ) : tablingEvents.map(event => (
                  <TableRow key={event.id}>
                    <TableCell style={topCell}>{event.name}</TableCell>
                    <TableCell className="text-center" style={topCell}>{event.date ? format(event.date, "MMM d, yyyy") : ""}</TableCell>
                    <TableCell className="text-center" style={topCell}>{event.startTime}</TableCell>
                    <TableCell className="text-center" style={topCell}>{event.endTime}</TableCell>
                    <TableCell style={topCell}>{event.location}</TableCell>
                    <TableCell style={topCell}>
                      <div className="flex flex-col gap-1 items-start">
                        {event.staff.filter(s => s.trim()).map((name, idx) => <div key={idx}>{name}</div>)}
                      </div>
                    </TableCell>
                    <TableCell style={{ ...statusColStyle, verticalAlign: "top" }}>
                      <div className="flex justify-center">
                        <Select value={event.spaceStatus} onValueChange={(val: RequestStatus) => { const c = [...tablingEvents]; c[c.findIndex(e => e.id === event.id)].spaceStatus = val; setTablingEvents(c); }}>
                          <SelectTrigger style={getStatusColor(event.spaceStatus)} className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="n/a">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell style={{ ...statusColStyle, verticalAlign: "top" }}>
                      <div className="flex justify-center">
                        <Select value={event.cateringStatus} onValueChange={(val: RequestStatus) => { const c = [...tablingEvents]; c[c.findIndex(e => e.id === event.id)].cateringStatus = val; setTablingEvents(c); }}>
                          <SelectTrigger style={getStatusColor(event.cateringStatus)} className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="n/a">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell style={notesCellStyle}><span className="text-sm text-muted-foreground">{event.notes}</span></TableCell>
                    <TableCell className="text-center" style={topCell}>
                      <div className="flex justify-center" style={{ paddingTop: "9px" }}>
                        <input type="checkbox" checked={false} onChange={e => { handleMarkComplete(event); e.target.checked = false; }} className="cursor-pointer" />
                      </div>
                    </TableCell>
                    <TableCell style={topCell}>
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingEvent(event); setNewTablingEvent(event); setIsDialogOpen(true); }} title="Edit"><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDuplicate(event)} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(event.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {activeTab === "presentations" && (
                presentationEvents.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No events yet. Click "Add Event" to get started.</TableCell></TableRow>
                ) : presentationEvents.map(event => (
                  <TableRow key={event.id}>
                    <TableCell style={topCell}>{event.course}</TableCell>
                    <TableCell style={topCell}>{event.instructorName}</TableCell>
                    <TableCell style={topCell}>{event.instructorEmail}</TableCell>
                    <TableCell className="text-center" style={topCell}>{event.date ? format(event.date, "MMM d, yyyy") : ""}</TableCell>
                    <TableCell className="text-center" style={topCell}>{event.time}</TableCell>
                    <TableCell style={topCell}>{event.location}</TableCell>
                    <TableCell style={topCell}>
                      <div className="flex flex-col gap-1 items-start">
                        {event.staff.filter(s => s.trim()).map((name, idx) => <div key={idx}>{name}</div>)}
                      </div>
                    </TableCell>
                    <TableCell style={notesCellStyle}><span className="text-sm text-muted-foreground">{event.notes}</span></TableCell>
                    <TableCell className="text-center" style={topCell}>
                      <div className="flex justify-center" style={{ paddingTop: "9px" }}>
                        <input type="checkbox" checked={false} onChange={e => { handleMarkComplete(event); e.target.checked = false; }} className="cursor-pointer" />
                      </div>
                    </TableCell>
                    <TableCell style={topCell}>
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingEvent(event); setNewPresentationEvent(event); setIsDialogOpen(true); }} title="Edit"><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDuplicate(event)} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(event.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {activeTab === "completed" && (
                completedEvents.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No completed events yet.</TableCell></TableRow>
                ) : completedEvents.map(event => (
                  <TableRow key={event.id}>
                    <TableCell style={{ ...topCell, paddingTop: "10px" }}>{event.name}</TableCell>
                    <TableCell className="text-center capitalize" style={{ ...topCell, paddingTop: "10px" }}>{event.source === "tabling" ? "Tabling" : "Presentation"}</TableCell>
                    <TableCell className="text-center" style={{ ...topCell, paddingTop: "10px" }}>{event.date ? format(event.date, "MMM d, yyyy") : ""}</TableCell>
                    <TableCell className="text-center" style={{ ...topCell, paddingTop: "10px" }}>{event.time}</TableCell>
                    <TableCell style={{ ...topCell, paddingTop: "10px" }}>{event.location}</TableCell>
                    <TableCell className="text-center" style={topCell}>
                      <Input type="number" value={event.interacted} onChange={e => { const v = e.target.value; updateCompletedInteracted(event.id, v === "" ? "" : parseInt(v)); }} className="w-20 mx-auto" />
                    </TableCell>
                    <TableCell style={{ ...notesCellStyle, paddingTop: "10px" }}><span className="text-sm text-muted-foreground">{event.notes}</span></TableCell>
                    <TableCell style={{ ...topCell, paddingTop: "10px" }}>
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingEvent(event); setNewCompletedEvent({ name: event.name, date: event.date, time: event.time, location: event.location, interacted: event.interacted, notes: event.notes }); setIsDialogOpen(true); }} title="Edit"><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDuplicate(event)} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleMarkIncomplete(event)} title="Mark incomplete"><Undo className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(event.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal={false}>
        {isDialogOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/80"
            onClick={() => setIsDialogOpen(false)}
          />
        )}
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto z-50">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
            <DialogDescription>Fill in event details below.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">

            {/* TABLING FORM */}
            {activeTab === "tabling" && (<>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="t-name" className="text-right">Event Name</Label>
                <Input id="t-name" value={newTablingEvent.name} onChange={e => setNewTablingEvent({ ...newTablingEvent, name: e.target.value })} className="col-span-3" placeholder="e.g., Tabling" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !newTablingEvent.date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newTablingEvent.date ? format(newTablingEvent.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newTablingEvent.date} onSelect={d => { if (d) setNewTablingEvent({ ...newTablingEvent, date: d }); setIsCalendarOpen(false); }} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="t-start" className="text-right">Start Time</Label>
                <Input id="t-start" value={newTablingEvent.startTime} onChange={e => setNewTablingEvent({ ...newTablingEvent, startTime: e.target.value })} placeholder="e.g., 12:30 PM" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="t-end" className="text-right">End Time</Label>
                <Input id="t-end" value={newTablingEvent.endTime} onChange={e => setNewTablingEvent({ ...newTablingEvent, endTime: e.target.value })} placeholder="e.g., 2:00 PM" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="t-loc" className="text-right">Location</Label>
                <Input id="t-loc" value={newTablingEvent.location} onChange={e => setNewTablingEvent({ ...newTablingEvent, location: e.target.value })} className="col-span-3" placeholder="e.g., Illini Union" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="t-staff" className="text-right">Staff</Label>
                <textarea id="t-staff" value={newTablingEvent.staff?.join("\n")} onChange={e => setNewTablingEvent({ ...newTablingEvent, staff: e.target.value.split("\n") })} className={`min-h-[80px] ${taStyle}`} placeholder="Enter staff names (one per line)" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="t-notes" className="text-right">Notes</Label>
                <textarea id="t-notes" value={newTablingEvent.notes} onChange={e => setNewTablingEvent({ ...newTablingEvent, notes: e.target.value })} className={`min-h-[80px] ${taStyle}`} placeholder="Any additional notes..." />
              </div>
            </>)}

            {/* PRESENTATIONS FORM */}
            {activeTab === "presentations" && (<>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="p-course" className="text-right">Course</Label>
                <Input id="p-course" value={newPresentationEvent.course} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, course: e.target.value })} className="col-span-3" placeholder="e.g., LEAD 260" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="p-iname" className="text-right">Instructor Name</Label>
                <Input id="p-iname" value={newPresentationEvent.instructorName} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, instructorName: e.target.value })} className="col-span-3" placeholder="e.g., Professor XYZ" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="p-iemail" className="text-right">Instructor Email</Label>
                <Input id="p-iemail" type="email" value={newPresentationEvent.instructorEmail} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, instructorEmail: e.target.value })} className="col-span-3" placeholder="e.g., xyz@illinois.edu" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !newPresentationEvent.date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newPresentationEvent.date ? format(newPresentationEvent.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newPresentationEvent.date} onSelect={d => { if (d) setNewPresentationEvent({ ...newPresentationEvent, date: d }); setIsCalendarOpen(false); }} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="p-time" className="text-right">Time</Label>
                <Input id="p-time" value={newPresentationEvent.time} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, time: e.target.value })} placeholder="e.g., 2:00 PM" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="p-loc" className="text-right">Location</Label>
                <Input id="p-loc" value={newPresentationEvent.location} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, location: e.target.value })} className="col-span-3" placeholder="e.g., Illini Union" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="p-staff" className="text-right">Staff</Label>
                <textarea id="p-staff" value={newPresentationEvent.staff?.join("\n")} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, staff: e.target.value.split("\n") })} className={`min-h-[80px] ${taStyle}`} placeholder="Enter staff names (one per line)" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="p-notes" className="text-right">Notes</Label>
                <textarea id="p-notes" value={newPresentationEvent.notes} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, notes: e.target.value })} className={`min-h-[80px] ${taStyle}`} placeholder="Any additional notes..." />
              </div>
            </>)}

            {/* COMPLETED FORM */}
            {activeTab === "completed" && (<>
              {!editingEvent && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Event Type</Label>
                  <Select value={completedEventSource} onValueChange={(val: EventSource) => setCompletedEventSource(val)}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tabling">Tabling</SelectItem>
                      <SelectItem value="presentations">Presentation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="c-name" className="text-right">{!editingEvent ? (completedEventSource === "tabling" ? "Event Name" : "Course") : "Event Name"}</Label>
                <Input id="c-name" value={newCompletedEvent.name} onChange={e => setNewCompletedEvent({ ...newCompletedEvent, name: e.target.value })} className="col-span-3" placeholder={!editingEvent ? (completedEventSource === "tabling" ? "e.g., Tabling" : "e.g., LEAD 260") : "e.g., Tabling or LEAD 260"} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !newCompletedEvent.date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newCompletedEvent.date ? format(newCompletedEvent.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newCompletedEvent.date} onSelect={d => { if (d) setNewCompletedEvent({ ...newCompletedEvent, date: d }); setIsCalendarOpen(false); }} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              {!editingEvent && completedEventSource === "tabling" && (<>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="c-start" className="text-right">Start Time</Label>
                  <Input id="c-start" value={newTablingEvent.startTime} onChange={e => setNewTablingEvent({ ...newTablingEvent, startTime: e.target.value })} placeholder="e.g., 12:30 PM" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="c-end" className="text-right">End Time</Label>
                  <Input id="c-end" value={newTablingEvent.endTime} onChange={e => setNewTablingEvent({ ...newTablingEvent, endTime: e.target.value })} placeholder="e.g., 2:00 PM" className="col-span-3" />
                </div>
              </>)}
              {!editingEvent && completedEventSource === "presentations" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="c-ptime" className="text-right">Time</Label>
                  <Input id="c-ptime" value={newPresentationEvent.time} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, time: e.target.value })} placeholder="e.g., 2:00 PM" className="col-span-3" />
                </div>
              )}
              {editingEvent && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="c-time" className="text-right">Time</Label>
                  <Input id="c-time" value={newCompletedEvent.time} onChange={e => setNewCompletedEvent({ ...newCompletedEvent, time: e.target.value })} className="col-span-3" placeholder="e.g., 9:00 AM - 11:00 AM" />
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="c-loc" className="text-right">Location</Label>
                <Input id="c-loc" value={newCompletedEvent.location} onChange={e => setNewCompletedEvent({ ...newCompletedEvent, location: e.target.value })} className="col-span-3" placeholder="e.g., Illini Union" />
              </div>
              {!editingEvent && completedEventSource === "tabling" && (<>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="c-staff" className="text-right">Staff</Label>
                  <textarea id="c-staff" value={newTablingEvent.staff?.join("\n")} onChange={e => setNewTablingEvent({ ...newTablingEvent, staff: e.target.value.split("\n") })} className={`min-h-[60px] ${taStyle}`} placeholder="Enter staff names (one per line)" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Space Status</Label>
                  <Select value={newTablingEvent.spaceStatus || "pending"} onValueChange={(val: RequestStatus) => setNewTablingEvent({ ...newTablingEvent, spaceStatus: val })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="n/a">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Catering Status</Label>
                  <Select value={newTablingEvent.cateringStatus || "pending"} onValueChange={(val: RequestStatus) => setNewTablingEvent({ ...newTablingEvent, cateringStatus: val })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="n/a">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>)}
              {!editingEvent && completedEventSource === "presentations" && (<>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="c-iname" className="text-right">Instructor Name</Label>
                  <Input id="c-iname" value={newPresentationEvent.instructorName} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, instructorName: e.target.value })} className="col-span-3" placeholder="e.g., Jennifer Smist" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="c-iemail" className="text-right">Instructor Email</Label>
                  <Input id="c-iemail" type="email" value={newPresentationEvent.instructorEmail} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, instructorEmail: e.target.value })} className="col-span-3" placeholder="e.g., jsmist@illinois.edu" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="c-pstaff" className="text-right">Staff</Label>
                  <textarea id="c-pstaff" value={newPresentationEvent.staff?.join("\n")} onChange={e => setNewPresentationEvent({ ...newPresentationEvent, staff: e.target.value.split("\n") })} className={`min-h-[60px] ${taStyle}`} placeholder="Enter staff names (one per line)" />
                </div>
              </>)}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="c-interacted" className="text-right"># Interacted</Label>
                <Input id="c-interacted" type="number" value={newCompletedEvent.interacted} onChange={e => setNewCompletedEvent({ ...newCompletedEvent, interacted: e.target.value === "" ? "" : parseInt(e.target.value) })} className="col-span-3" placeholder="e.g., 50" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="c-notes" className="text-right">Notes</Label>
                <textarea id="c-notes" value={newCompletedEvent.notes} onChange={e => setNewCompletedEvent({ ...newCompletedEvent, notes: e.target.value })} className={`min-h-[80px] ${taStyle}`} placeholder="Any additional notes..." />
              </div>
            </>)}

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddOrEditEvent}>{editingEvent ? "Save Changes" : "Add Event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Complete — interactions + notes prompt */}
      <Dialog open={!!pendingComplete} onOpenChange={(open) => { if (!open) setPendingComplete(null); }} modal={false}>
        {pendingComplete && (
          <div className="fixed inset-0 z-40 bg-black/80" onClick={() => setPendingComplete(null)} />
        )}
        <DialogContent className="sm:max-w-[360px] z-50">
          <DialogHeader>
            <DialogTitle>Mark as Complete</DialogTitle>
            <DialogDescription>Add any final details for this event (optional).</DialogDescription>
          </DialogHeader>
          <div className="py-2 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pc-interacted"># Interacted</Label>
              <Input
                id="pc-interacted"
                type="number"
                placeholder="e.g., 50 (optional)"
                value={pendingComplete?.interacted ?? ""}
                onChange={e => setPendingComplete(prev => prev ? { ...prev, interacted: e.target.value === "" ? "" : parseInt(e.target.value) } : prev)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pc-notes">Additional Notes</Label>
              <textarea
                id="pc-notes"
                placeholder="Add notes about this event"
                value={pendingComplete?.notes ?? ""}
                onChange={e => setPendingComplete(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                className={`min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingComplete(null)}>Cancel</Button>
            <Button onClick={confirmMarkComplete}>Mark Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
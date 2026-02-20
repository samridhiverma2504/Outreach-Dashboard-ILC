import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, CalendarIcon, Edit, Undo } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
}

interface CompletedEvent {
  id: string;
  name: string;
  date: Date | undefined;
  time: string;
  location: string;
  interacted: number | "";
  source: EventSource;
  originalEvent: TablingEvent | PresentationEvent;
}

// Helper function to format time input
const formatTimeInput = (input: string): string => {
  if (!input) return "";
  
  // Remove all non-digit and non-colon characters
  let cleaned = input.replace(/[^0-9:]/g, '');
  
  // Handle various input formats
  if (cleaned.length === 0) return "";
  
  // If input is just numbers, auto-format
  if (!cleaned.includes(':')) {
    if (cleaned.length <= 2) {
      // Just hours: "9" or "09" -> keep as is for now
      return cleaned;
    } else if (cleaned.length === 3) {
      // "930" -> "9:30"
      return cleaned.slice(0, 1) + ':' + cleaned.slice(1);
    } else if (cleaned.length >= 4) {
      // "0930" -> "09:30"
      return cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
    }
  }
  
  // Already has colon, just clean up
  const parts = cleaned.split(':');
  if (parts.length >= 2) {
    const hours = parts[0].slice(0, 2);
    const minutes = parts[1].slice(0, 2);
    return hours + (minutes ? ':' + minutes : '');
  }
  
  return cleaned;
};

// Helper function to add AM/PM if not present
const ensureAMPM = (timeStr: string): string => {
  if (!timeStr) return "";
  
  const upper = timeStr.toUpperCase().trim();
  
  // Already has AM or PM
  if (upper.includes('AM') || upper.includes('PM')) {
    return timeStr.trim();
  }
  
  // Parse the hour to determine AM/PM
  const timePart = formatTimeInput(timeStr);
  if (!timePart) return timeStr;
  
  const hourMatch = timePart.match(/^(\d{1,2})/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1]);
    // Default to PM for common working hours (9-23), AM otherwise
    if (hour >= 9 && hour <= 23) {
      return timePart + ' PM';
    } else if (hour >= 1 && hour <= 8) {
      return timePart + ' AM';
    } else {
      return timePart + ' PM'; // Default to PM for 12
    }
  }
  
  return timeStr;
};

export function ReservationTracker({ onNavigateToEmailGenerator }) {
  const [activeTab, setActiveTab] = useState<"tabling" | "presentations" | "completed">("tabling");

  const [tablingEvents, setTablingEvents] = useState<TablingEvent[]>(() => {
    const saved = localStorage.getItem('tablingEvents');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert date strings back to Date objects
      return parsed.map((event: any) => ({
        ...event,
        date: event.date ? new Date(event.date) : undefined
      }));
    }
    return [
      {
        id: "sample1",
        name: "Tabling",
        date: new Date(),
        startTime: "11:00 AM",
        endTime: "2:00 PM",
        location: "Illini Union",
        staff: ["Aniya", "Jenna", "Samridhi", "Taya", "Vaanathi"],
        spaceStatus: "submitted",
        cateringStatus: "pending",
      }
    ];
  });
  const [presentationEvents, setPresentationEvents] = useState<PresentationEvent[]>(() => {
    const saved = localStorage.getItem('presentationEvents');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert date strings back to Date objects
      return parsed.map((event: any) => ({
        ...event,
        date: event.date ? new Date(event.date) : undefined
      }));
    }
    return [
      {
        id: "sample2",
        course: "LEAD 260",
        instructorName: "Jennifer Smist",
        instructorEmail: "jsmist@illinois.edu",
        date: new Date(),
        time: "11:00 AM",
        location: "103 Bevier Hall",
        staff: ["Samridhi"],
      }
    ];
  });
  const [completedEvents, setCompletedEvents] = useState<CompletedEvent[]>(() => {
    const saved = localStorage.getItem('completedEvents');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert date strings back to Date objects
      return parsed.map((event: any) => ({
        ...event,
        date: event.date ? new Date(event.date) : undefined,
        originalEvent: {
          ...event.originalEvent,
          date: event.originalEvent.date ? new Date(event.originalEvent.date) : undefined
        }
      }));
    }
    return [];
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TablingEvent | PresentationEvent | CompletedEvent | null>(null);

  // NEW: State for selecting event source when adding completed event
  const [completedEventSource, setCompletedEventSource] = useState<EventSource>("tabling");

  const [newTablingEvent, setNewTablingEvent] = useState<Partial<TablingEvent>>({
    name: "",
    date: undefined,
    startTime: "",
    endTime: "",
    location: "",
    staff: [],
    spaceStatus: "pending",
    cateringStatus: "pending",
  });

  const [newPresentationEvent, setNewPresentationEvent] = useState<Partial<PresentationEvent>>({
    course: "",
    instructorName: "",
    instructorEmail: "",
    date: undefined,
    time: "",
    location: "",
    staff: [],
  });

  const [newCompletedEvent, setNewCompletedEvent] = useState<Partial<CompletedEvent>>({
    name: "",
    date: undefined,
    time: "",
    location: "",
    interacted: "",
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('tablingEvents', JSON.stringify(tablingEvents));
  }, [tablingEvents]);

  useEffect(() => {
    localStorage.setItem('presentationEvents', JSON.stringify(presentationEvents));
  }, [presentationEvents]);

  useEffect(() => {
    localStorage.setItem('completedEvents', JSON.stringify(completedEvents));
  }, [completedEvents]);

  const resetNewEvents = () => {
    setNewTablingEvent({
      name: "",
      date: undefined,
      startTime: "",
      endTime: "",
      location: "",
      staff: [],
      spaceStatus: "pending",
      cateringStatus: "pending",
    });
    setNewPresentationEvent({
      course: "",
      instructorName: "",
      instructorEmail: "",
      date: undefined,
      time: "",
      location: "",
      staff: [],
    });
    setNewCompletedEvent({
      name: "",
      date: undefined,
      time: "",
      location: "",
      interacted: "",
    });
    setCompletedEventSource("tabling");
  };

  const handleAddOrEditEvent = () => {
    if (activeTab === "tabling") {
      if (!newTablingEvent.name || !newTablingEvent.date || !newTablingEvent.startTime || !newTablingEvent.endTime || !newTablingEvent.location) {
        toast.error("Please fill all required fields.");
        return;
      }

      // Format times before saving
      const formattedStartTime = ensureAMPM(newTablingEvent.startTime);
      const formattedEndTime = ensureAMPM(newTablingEvent.endTime);

      if (editingEvent) {
        const updateList = [...tablingEvents];
        const idx = updateList.findIndex(e => e.id === editingEvent.id);
        if (idx !== -1) updateList[idx] = { 
          ...(newTablingEvent as TablingEvent), 
          id: editingEvent.id,
          startTime: formattedStartTime,
          endTime: formattedEndTime
        };
        setTablingEvents(updateList);
        setEditingEvent(null);
        toast.success("Event updated");
      } else {
        const event: TablingEvent = {
          ...(newTablingEvent as TablingEvent),
          id: Math.random().toString(36).substr(2, 9),
          startTime: formattedStartTime,
          endTime: formattedEndTime
        };
        setTablingEvents([...tablingEvents, event]);
        toast.success("Event added");
      }
    } else if (activeTab === "presentations") {
      if (!newPresentationEvent.course || !newPresentationEvent.instructorName || !newPresentationEvent.instructorEmail || !newPresentationEvent.date || !newPresentationEvent.time || !newPresentationEvent.location) {
        toast.error("Please fill all required fields.");
        return;
      }

      // Format time before saving
      const formattedTime = ensureAMPM(newPresentationEvent.time);

      if (editingEvent) {
        const updateList = [...presentationEvents];
        const idx = updateList.findIndex(e => e.id === editingEvent.id);
        if (idx !== -1) updateList[idx] = { 
          ...(newPresentationEvent as PresentationEvent), 
          id: editingEvent.id,
          time: formattedTime
        };
        setPresentationEvents(updateList);
        setEditingEvent(null);
        toast.success("Event updated");
      } else {
        const event: PresentationEvent = {
          ...(newPresentationEvent as PresentationEvent),
          id: Math.random().toString(36).substr(2, 9),
          time: formattedTime
        };
        setPresentationEvents([...presentationEvents, event]);
        toast.success("Event added");
      }
    } else if (activeTab === "completed") {
      if (!newCompletedEvent.name || !newCompletedEvent.date || !newCompletedEvent.location) {
        toast.error("Please fill all required fields.");
        return;
      }

      // Additional validation for time based on event source when adding new event
      if (!editingEvent) {
        if (completedEventSource === "tabling") {
          if (!newTablingEvent.startTime || !newTablingEvent.endTime) {
            toast.error("Please fill all required fields.");
            return;
          }
        } else if (completedEventSource === "presentations") {
          if (!newPresentationEvent.time) {
            toast.error("Please fill all required fields.");
            return;
          }
        }
      } else {
        // When editing, check the time field
        if (!newCompletedEvent.time) {
          toast.error("Please fill all required fields.");
          return;
        }
      }

      if (editingEvent) {
        // Editing existing completed event
        const updateList = [...completedEvents];
        const idx = updateList.findIndex(e => e.id === (editingEvent as CompletedEvent).id);
        if (idx !== -1) {
          updateList[idx] = { 
            ...updateList[idx],
            name: newCompletedEvent.name!,
            date: newCompletedEvent.date,
            time: newCompletedEvent.time!,
            location: newCompletedEvent.location!,
            interacted: newCompletedEvent.interacted === "" ? "" : (newCompletedEvent.interacted || "")
          };
        }
        setCompletedEvents(updateList);
        setEditingEvent(null);
        toast.success("Event updated");
      } else {
        // NEW: Adding new completed event with full details based on source
        let originalEvent: TablingEvent | PresentationEvent;
        
        if (completedEventSource === "tabling") {
          const formattedStartTime = ensureAMPM(newTablingEvent.startTime || "");
          const formattedEndTime = ensureAMPM(newTablingEvent.endTime || "");
          
          originalEvent = {
            id: Math.random().toString(36).substr(2, 9),
            name: newCompletedEvent.name!,
            date: newCompletedEvent.date,
            startTime: formattedStartTime,
            endTime: formattedEndTime,
            location: newCompletedEvent.location!,
            staff: newTablingEvent.staff || [],
            spaceStatus: newTablingEvent.spaceStatus || "pending",
            cateringStatus: newTablingEvent.cateringStatus || "pending",
          } as TablingEvent;
        } else {
          const formattedTime = ensureAMPM(newPresentationEvent.time || "");
          
          originalEvent = {
            id: Math.random().toString(36).substr(2, 9),
            course: newCompletedEvent.name!,
            instructorName: newPresentationEvent.instructorName || "",
            instructorEmail: newPresentationEvent.instructorEmail || "",
            date: newCompletedEvent.date,
            time: formattedTime,
            location: newCompletedEvent.location!,
            staff: newPresentationEvent.staff || [],
          } as PresentationEvent;
        }

        const completed: CompletedEvent = {
          id: originalEvent.id,
          name: newCompletedEvent.name!,
          date: newCompletedEvent.date,
          time: completedEventSource === "tabling" 
            ? `${ensureAMPM(newTablingEvent.startTime || "")} - ${ensureAMPM(newTablingEvent.endTime || "")}`
            : ensureAMPM(newPresentationEvent.time || ""),
          location: newCompletedEvent.location!,
          interacted: newCompletedEvent.interacted === "" ? "" : (newCompletedEvent.interacted || ""),
          source: completedEventSource,
          originalEvent: originalEvent
        };
        
        setCompletedEvents([...completedEvents, completed]);
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

  const handleMarkComplete = (event: TablingEvent | PresentationEvent) => {
    // remove from original
    if (activeTab === "tabling") {
      setTablingEvents(tablingEvents.filter(e => e.id !== event.id));
      const tabEvent = event as TablingEvent;
      const completed: CompletedEvent = {
        id: tabEvent.id,
        name: tabEvent.name,
        date: tabEvent.date,
        time: `${tabEvent.startTime} - ${tabEvent.endTime}`,
        location: tabEvent.location,
        interacted: "",
        source: "tabling",
        originalEvent: tabEvent
      };
      setCompletedEvents([...completedEvents, completed]);
    } else if (activeTab === "presentations") {
      setPresentationEvents(presentationEvents.filter(e => e.id !== event.id));
      const presEvent = event as PresentationEvent;
      const completed: CompletedEvent = {
        id: presEvent.id,
        name: presEvent.course,
        date: presEvent.date,
        time: presEvent.time,
        location: presEvent.location,
        interacted: "",
        source: "presentations",
        originalEvent: presEvent
      };
      setCompletedEvents([...completedEvents, completed]);
    }
    toast.success("Event marked as complete");
  };

  const handleMarkIncomplete = (event: CompletedEvent) => {
    // Remove from completed
    setCompletedEvents(completedEvents.filter(e => e.id !== event.id));
    
    // Add back to original source
    if (event.source === "tabling") {
      setTablingEvents([...tablingEvents, event.originalEvent as TablingEvent]);
    } else if (event.source === "presentations") {
      setPresentationEvents([...presentationEvents, event.originalEvent as PresentationEvent]);
    }
    
    toast.success("Event marked as incomplete");
  };

  const updateCompletedInteracted = (id: string, value: number | "") => {
    setCompletedEvents(completedEvents.map(e => e.id === id ? { ...e, interacted: value } : e));
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "submitted": return "bg-green-100 text-green-800";
      case "n/a": return "bg-gray-100 text-gray-800";
      default: return "";
    }
  };

  const openAddDialog = () => {
    setEditingEvent(null);
    resetNewEvents();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Event Tracker</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        {["tabling", "presentations", "completed"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-4 py-2 font-medium",
              activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Event Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center min-h-[40px]">
            <div>
              <CardTitle>
                {activeTab === "tabling" ? "Tabling Events" : activeTab === "presentations" ? "Presentations" : "Completed Events"}
              </CardTitle>
              <CardDescription>
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              {activeTab === "tabling" && (
                <>
                  <Button variant="outline" onClick={() => window.open("https://illiniunion.illinois.edu/EventServices/SubmitRequest.aspx", "_blank")}>
                    Reserve Space
                  </Button>
                  <Button variant="outline" onClick={() => onNavigateToEmailGenerator?.('catering')}>
                    Email Catering
                  </Button>
                  <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </>
              )}
              {activeTab === "presentations" && (
                <>
                  <Button variant="outline" onClick={() => onNavigateToEmailGenerator?.('presentations')}>
                    Email Instructor
                  </Button>
                  <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </>
              )}
              {activeTab === "completed" && (
                <>
                  <Button variant="outline" className="pointer-events-none">
                    Total # Interacted: {completedEvents.reduce((sum, event) => sum + (typeof event.interacted === 'number' ? event.interacted : 0), 0)}
                  </Button>
                  <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {activeTab === "tabling" && (
                  <>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Space Status</TableHead>
                    <TableHead>Catering Status</TableHead>
                    <TableHead className="text-center">Complete</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </>
                )}
                {activeTab === "presentations" && (
                  <>
                    <TableHead>Course</TableHead>
                    <TableHead>Instructor Name</TableHead>
                    <TableHead>Instructor Email</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-center">Complete</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </>
                )}
                {activeTab === "completed" && (
                  <>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead># Interacted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTab === "tabling" && (
                tablingEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No events yet. Click "Add Event" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  tablingEvents.map(event => (
                    <TableRow key={event.id}>
                      <TableCell>{event.name}</TableCell>
                      <TableCell>{event.date ? format(event.date, "MMM d, yyyy") : ""}</TableCell>
                      <TableCell>{event.startTime}</TableCell>
                      <TableCell>{event.endTime}</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {event.staff.filter(s => s.trim()).map((name, idx) => (
                            <div key={idx}>{name}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={event.spaceStatus} 
                          onValueChange={(val: RequestStatus) => {
                            const copy = [...tablingEvents];
                            const idx = copy.findIndex(e => e.id === event.id);
                            copy[idx].spaceStatus = val;
                            setTablingEvents(copy);
                          }}
                        >
                          <SelectTrigger className={`w-[120px] h-8 ${getStatusColor(event.spaceStatus)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="n/a">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={event.cateringStatus} 
                          onValueChange={(val: RequestStatus) => {
                            const copy = [...tablingEvents];
                            const idx = copy.findIndex(e => e.id === event.id);
                            copy[idx].cateringStatus = val;
                            setTablingEvents(copy);
                          }}
                        >
                          <SelectTrigger className={`w-[120px] h-8 ${getStatusColor(event.cateringStatus)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="n/a">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          onChange={() => handleMarkComplete(event)} 
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => { 
                              setEditingEvent(event); 
                              setNewTablingEvent(event); 
                              setIsDialogOpen(true); 
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50" 
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
              {activeTab === "presentations" && (
                presentationEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No events yet. Click "Add Event" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  presentationEvents.map(event => (
                    <TableRow key={event.id}>
                      <TableCell>{event.course}</TableCell>
                      <TableCell>{event.instructorName}</TableCell>
                      <TableCell>{event.instructorEmail}</TableCell>
                      <TableCell>{event.date ? format(event.date, "MMM d, yyyy") : ""}</TableCell>
                      <TableCell>{event.time}</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {event.staff.filter(s => s.trim()).map((name, idx) => (
                            <div key={idx}>{name}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          onChange={() => handleMarkComplete(event)} 
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => { 
                              setEditingEvent(event); 
                              setNewPresentationEvent(event); 
                              setIsDialogOpen(true); 
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50" 
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
              {activeTab === "completed" && (
                completedEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No completed events yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  completedEvents.map(event => (
                    <TableRow key={event.id}>
                      <TableCell>{event.name}</TableCell>
                      <TableCell className="capitalize">{event.source === "tabling" ? "Tabling" : "Presentation"}</TableCell>
                      <TableCell>{event.date ? format(event.date, "MMM d, yyyy") : ""}</TableCell>
                      <TableCell>{event.time}</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={event.interacted} 
                          onChange={e => {
                            const val = e.target.value;
                            updateCompletedInteracted(event.id, val === "" ? "" : parseInt(val));
                          }}
                          className="w-20" 
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => { 
                              setEditingEvent(event); 
                              setNewCompletedEvent({
                                name: event.name,
                                date: event.date,
                                time: event.time,
                                location: event.location,
                                interacted: event.interacted
                              }); 
                              setIsDialogOpen(true); 
                            }}
                            title="Edit event"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleMarkIncomplete(event)}
                            title="Mark as incomplete"
                          >
                            <Undo className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50" 
                            onClick={() => handleDelete(event.id)}
                            title="Delete event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
            <DialogDescription>Fill in event details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {activeTab === "tabling" ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Event Name</Label>
                  <Input 
                    id="name" 
                    value={newTablingEvent.name} 
                    onChange={e => setNewTablingEvent({ ...newTablingEvent, name: e.target.value })} 
                    className="col-span-3" 
                    placeholder="e.g., Tabling"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Date</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn(
                          "col-span-3 justify-start text-left font-normal", 
                          !newTablingEvent.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTablingEvent.date ? format(newTablingEvent.date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={newTablingEvent.date} 
                        onSelect={(date) => { 
                          if(date) setNewTablingEvent({ ...newTablingEvent, date }); 
                          setIsCalendarOpen(false); 
                        }} 
                        initialFocus 
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="startTime" className="text-right">Start Time</Label>
                  <Input
                    id="startTime"
                    value={newTablingEvent.startTime}
                    onChange={(e) => setNewTablingEvent({ ...newTablingEvent, startTime: e.target.value })}
                    placeholder="e.g., 12:30 PM"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="endTime" className="text-right">End Time</Label>
                  <Input
                    id="endTime"
                    value={newTablingEvent.endTime}
                    onChange={(e) => setNewTablingEvent({ ...newTablingEvent, endTime: e.target.value })}
                    placeholder="e.g., 2:00 PM"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="loc" className="text-right">Location</Label>
                  <Input 
                    id="loc" 
                    value={newTablingEvent.location} 
                    onChange={e => setNewTablingEvent({ ...newTablingEvent, location: e.target.value })} 
                    className="col-span-3" 
                    placeholder="e.g., Illini Union"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="staff" className="text-right">Staff</Label>
                  <textarea 
                    id="staff" 
                    value={newTablingEvent.staff?.join("\n")} 
                    onChange={e => setNewTablingEvent({ ...newTablingEvent, staff: e.target.value.split("\n") })} 
                    className="col-span-3 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    placeholder="Enter staff names (one per line)"
                  />
                </div>
              </>
            ) : activeTab === "presentations" ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="course" className="text-right">Course</Label>
                  <Input 
                    id="course" 
                    value={newPresentationEvent.course} 
                    onChange={e => setNewPresentationEvent({ ...newPresentationEvent, course: e.target.value })} 
                    className="col-span-3" 
                    placeholder="e.g., LEAD 260"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="instructorName" className="text-right">Instructor Name</Label>
                  <Input 
                    id="instructorName" 
                    value={newPresentationEvent.instructorName} 
                    onChange={e => setNewPresentationEvent({ ...newPresentationEvent, instructorName: e.target.value })} 
                    className="col-span-3" 
                    placeholder="e.g., Professor XYZ"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="instructorEmail" className="text-right">Instructor Email</Label>
                  <Input 
                    id="instructorEmail" 
                    type="email"
                    value={newPresentationEvent.instructorEmail} 
                    onChange={e => setNewPresentationEvent({ ...newPresentationEvent, instructorEmail: e.target.value })} 
                    className="col-span-3" 
                    placeholder="e.g., xyz@illinois.edu"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Date</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn(
                          "col-span-3 justify-start text-left font-normal", 
                          !newPresentationEvent.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newPresentationEvent.date ? format(newPresentationEvent.date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={newPresentationEvent.date} 
                        onSelect={(date) => { 
                          if(date) setNewPresentationEvent({ ...newPresentationEvent, date }); 
                          setIsCalendarOpen(false); 
                        }} 
                        initialFocus 
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="time" className="text-right">Time</Label>
                  <Input
                    id="time"
                    value={newPresentationEvent.time}
                    onChange={(e) => setNewPresentationEvent({ ...newPresentationEvent, time: e.target.value })}
                    placeholder="e.g., 2:00 PM"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="presLoc" className="text-right">Location</Label>
                  <Input 
                    id="presLoc" 
                    value={newPresentationEvent.location} 
                    onChange={e => setNewPresentationEvent({ ...newPresentationEvent, location: e.target.value })} 
                    className="col-span-3" 
                    placeholder="e.g., Illini Union"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="presStaff" className="text-right">Staff</Label>
                  <textarea 
                    id="presStaff" 
                    value={newPresentationEvent.staff?.join("\n")} 
                    onChange={e => setNewPresentationEvent({ ...newPresentationEvent, staff: e.target.value.split("\n") })} 
                    className="col-span-3 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    placeholder="Enter staff names (one per line)"
                  />
                </div>
              </>
            ) : (
              <>
                {/* NEW: Event source selection for completed events */}
                {!editingEvent && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Event Type</Label>
                    <Select 
                      value={completedEventSource} 
                      onValueChange={(val: EventSource) => setCompletedEventSource(val)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tabling">Tabling</SelectItem>
                        <SelectItem value="presentations">Presentation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="compName" className="text-right">
                    {!editingEvent ? (completedEventSource === "tabling" ? "Event Name" : "Course") : "Event Name"}
                  </Label>
                  <Input 
                    id="compName" 
                    value={newCompletedEvent.name} 
                    onChange={e => setNewCompletedEvent({ ...newCompletedEvent, name: e.target.value })} 
                    className="col-span-3" 
                    placeholder={!editingEvent ? (completedEventSource === "tabling" ? "e.g., Tabling" : "e.g., LEAD 260") : "e.g., Tabling or LEAD 260"}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Date</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn(
                          "col-span-3 justify-start text-left font-normal", 
                          !newCompletedEvent.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newCompletedEvent.date ? format(newCompletedEvent.date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={newCompletedEvent.date} 
                        onSelect={(date) => { 
                          if(date) setNewCompletedEvent({ ...newCompletedEvent, date }); 
                          setIsCalendarOpen(false); 
                        }} 
                        initialFocus 
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time fields based on event source when adding new completed event */}
                {!editingEvent && completedEventSource === "tabling" && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="tabStartTime" className="text-right">Start Time</Label>
                      <Input
                        id="tabStartTime"
                        value={newTablingEvent.startTime}
                        onChange={(e) => setNewTablingEvent({ ...newTablingEvent, startTime: e.target.value })}
                        placeholder="e.g., 12:30 PM"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="tabEndTime" className="text-right">End Time</Label>
                      <Input
                        id="tabEndTime"
                        value={newTablingEvent.endTime}
                        onChange={(e) => setNewTablingEvent({ ...newTablingEvent, endTime: e.target.value })}
                        placeholder="e.g., 2:00 PM"
                        className="col-span-3"
                      />
                    </div>
                  </>
                )}
                
                {!editingEvent && completedEventSource === "presentations" && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="presTime" className="text-right">Time</Label>
                    <Input
                      id="presTime"
                      value={newPresentationEvent.time}
                      onChange={(e) => setNewPresentationEvent({ ...newPresentationEvent, time: e.target.value })}
                      placeholder="e.g., 2:00 PM"
                      className="col-span-3"
                    />
                  </div>
                )}
                
                {/* Show time field for editing existing completed events */}
                {editingEvent && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="compTime" className="text-right">Time</Label>
                    <Input 
                      id="compTime" 
                      value={newCompletedEvent.time} 
                      onChange={e => setNewCompletedEvent({ ...newCompletedEvent, time: e.target.value })} 
                      className="col-span-3" 
                      placeholder="e.g., 9:00 AM - 11:00 AM or 9:00 AM"
                    />
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="compLoc" className="text-right">Location</Label>
                  <Input 
                    id="compLoc" 
                    value={newCompletedEvent.location} 
                    onChange={e => setNewCompletedEvent({ ...newCompletedEvent, location: e.target.value })} 
                    className="col-span-3" 
                    placeholder="e.g., Illini Union"
                  />
                </div>
                
                {/* Additional fields based on event source when adding new completed event */}
                {!editingEvent && completedEventSource === "tabling" && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="tabStaff" className="text-right">Staff</Label>
                      <textarea 
                        id="tabStaff" 
                        value={newTablingEvent.staff?.join("\n")} 
                        onChange={e => setNewTablingEvent({ ...newTablingEvent, staff: e.target.value.split("\n") })} 
                        className="col-span-3 min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                        placeholder="Enter staff names (one per line)"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Space Status</Label>
                      <Select 
                        value={newTablingEvent.spaceStatus || "pending"} 
                        onValueChange={(val: RequestStatus) => setNewTablingEvent({ ...newTablingEvent, spaceStatus: val })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="n/a">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Catering Status</Label>
                      <Select 
                        value={newTablingEvent.cateringStatus || "pending"} 
                        onValueChange={(val: RequestStatus) => setNewTablingEvent({ ...newTablingEvent, cateringStatus: val })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="n/a">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {!editingEvent && completedEventSource === "presentations" && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="presInstructorName" className="text-right">Instructor Name</Label>
                      <Input 
                        id="presInstructorName" 
                        value={newPresentationEvent.instructorName} 
                        onChange={e => setNewPresentationEvent({ ...newPresentationEvent, instructorName: e.target.value })} 
                        className="col-span-3" 
                        placeholder="e.g., Jennifer Smist"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="presInstructorEmail" className="text-right">Instructor Email</Label>
                      <Input 
                        id="presInstructorEmail" 
                        type="email"
                        value={newPresentationEvent.instructorEmail} 
                        onChange={e => setNewPresentationEvent({ ...newPresentationEvent, instructorEmail: e.target.value })} 
                        className="col-span-3" 
                        placeholder="e.g., jsmist@illinois.edu"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="presCompStaff" className="text-right">Staff</Label>
                      <textarea 
                        id="presCompStaff" 
                        value={newPresentationEvent.staff?.join("\n")} 
                        onChange={e => setNewPresentationEvent({ ...newPresentationEvent, staff: e.target.value.split("\n") })} 
                        className="col-span-3 min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                        placeholder="Enter staff names (one per line)"
                      />
                    </div>
                  </>
                )}
                
                {/* # Interacted at the end for both types */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="compInteracted" className="text-right"># Interacted</Label>
                  <Input 
                    id="compInteracted" 
                    type="number"
                    value={newCompletedEvent.interacted} 
                    onChange={e => setNewCompletedEvent({ ...newCompletedEvent, interacted: e.target.value === "" ? "" : parseInt(e.target.value) })} 
                    className="col-span-3" 
                    placeholder="e.g., 50"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddOrEditEvent}>{editingEvent ? "Save Changes" : "Add Event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
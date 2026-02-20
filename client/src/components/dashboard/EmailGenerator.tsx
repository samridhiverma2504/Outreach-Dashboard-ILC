import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, RefreshCw, Plus, Trash2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/components/ui/utils";

interface CateringEvent {
  id: string;
  date: Date | undefined;
  startTime: string;
  endTime: string;
  guestCount: number;
  location: string;
  menuSelection: string;
}

export function EmailGenerator({ initialTab = "presentations" }: { initialTab?: "presentations" | "catering" }) {
  const [activeTab, setActiveTab] = useState<"presentations" | "catering">(initialTab);
  
  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Presentation form data
  const [presFormData, setPresFormData] = useState(() => {
    const saved = localStorage.getItem('presFormData');
    return saved ? JSON.parse(saved) : {
      instructorName: '',
      yourName: '',
      courseNumber: '',
      courseName: '',
      instructorEmail: ''
    };
  });
  const [presGeneratedEmail, setPresGeneratedEmail] = useState(() => {
    return localStorage.getItem('presGeneratedEmail') || '';
  });

  // Catering form data
  const [yourName, setYourName] = useState(() => {
    return localStorage.getItem('cateringYourName') || '';
  });
  const [contactPhone, setContactPhone] = useState(() => {
    return localStorage.getItem('cateringContactPhone') || '';
  });
  const [recipientEmail, setRecipientEmail] = useState(() => {
    return localStorage.getItem('cateringRecipientEmail') || '';
  });
  const [events, setEvents] = useState<CateringEvent[]>(() => {
    const saved = localStorage.getItem('cateringEvents');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert date strings back to Date objects
      return parsed.map((event: any) => ({
        ...event,
        date: event.date ? new Date(event.date) : undefined
      }));
    }
    return [];
  });
  const [cateringGeneratedEmail, setCateringGeneratedEmail] = useState(() => {
    return localStorage.getItem('cateringGeneratedEmail') || '';
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState<{ [key: string]: boolean }>({});

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('presFormData', JSON.stringify(presFormData));
  }, [presFormData]);

  useEffect(() => {
    localStorage.setItem('presGeneratedEmail', presGeneratedEmail);
  }, [presGeneratedEmail]);

  useEffect(() => {
    localStorage.setItem('cateringYourName', yourName);
  }, [yourName]);

  useEffect(() => {
    localStorage.setItem('cateringContactPhone', contactPhone);
  }, [contactPhone]);

  useEffect(() => {
    localStorage.setItem('cateringRecipientEmail', recipientEmail);
  }, [recipientEmail]);

  useEffect(() => {
    localStorage.setItem('cateringEvents', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('cateringGeneratedEmail', cateringGeneratedEmail);
  }, [cateringGeneratedEmail]);

  // Event management functions
  const addEvent = () => {
    const newEvent: CateringEvent = {
      id: Math.random().toString(36).substr(2, 9),
      date: undefined,
      startTime: '',
      endTime: '',
      guestCount: 0,
      location: '',
      menuSelection: ''
    };
    setEvents([...events, newEvent]);
  };

  const removeEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const updateEvent = (id: string, field: keyof CateringEvent, value: any) => {
    setEvents(events.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  // Presentation email generation
  const handleGeneratePresentation = () => {
    const { instructorName, yourName, courseNumber, courseName } = presFormData;
    if (!instructorName || !yourName || !courseNumber || !courseName) {
      toast.error("Please fill in all required fields");
      return;
    }

    const displayEmail = `Subject: Illinois Leadership Center Outreach Presentation

Hello ${instructorName},

My name is ${yourName} and I am a Brand Ambassador for the Illinois Leadership Center. We noticed that your course ${courseNumber}: ${courseName} covers topics that align closely with the work we do at the Leadership Center.

We believe your students could benefit from learning about the programs and resources we offer. We would greatly appreciate the opportunity to briefly present in your class. The presentation would take no more than 10 minutes.

If this is something you would be open to, I would be happy to coordinate around a time that works best for you. Please let me know if you have any questions or would like additional information.

Thank you!

Best,
${yourName}
Illinois Leadership Center
Outreach Team`;

    setPresGeneratedEmail(displayEmail);
    toast.success("Email generated!");
  };

  const copyPresToClipboard = () => {
    if (!presGeneratedEmail) return;
    navigator.clipboard.writeText(presGeneratedEmail);
    toast.success("Copied to clipboard!");
  };

  const openMailApp = () => {
    const { instructorEmail, instructorName, yourName, courseNumber, courseName } = presFormData;

    if (!instructorEmail) {
      toast.error("Please provide the instructor's email to open in Outlook");
      return;
    }

    const body = `Hello ${instructorName},

My name is ${yourName} and I am a Brand Ambassador for the Illinois Leadership Center. We noticed that your course ${courseNumber}: ${courseName} covers topics that align closely with the work we do at the Leadership Center.

We believe your students could benefit from learning about the programs and resources we offer. We would greatly appreciate the opportunity to briefly present in your class. The presentation would take no more than 10 minutes.

If this is something you would be open to, I would be happy to coordinate around a time that works best for you. Please let me know if you have any questions or would like additional information.

Thank you!

Best,
${yourName}
Illinois Leadership Center
Outreach Team`;

    const mailtoLink = `mailto:${encodeURIComponent(instructorEmail)}?subject=${encodeURIComponent(
      "Illinois Leadership Center Outreach Presentation"
    )}&body=${encodeURIComponent(body)}`;

    window.open(mailtoLink, "_blank");
  };

  // Time formatting functions
  const formatTime = (timeStr: string): string => {
    if (!timeStr) return '';
    
    let cleaned = timeStr.replace(/[^0-9:]/g, '');
    
    if (!cleaned.includes(':')) {
      if (cleaned.length <= 2) {
        return cleaned;
      } else if (cleaned.length === 3) {
        return cleaned.slice(0, 1) + ':' + cleaned.slice(1);
      } else if (cleaned.length >= 4) {
        return cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
      }
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
    if (!timeStr) return '';
    
    const upper = timeStr.toUpperCase().trim();
    if (upper.includes('AM') || upper.includes('PM')) {
      return timeStr.trim().replace(/\s*(AM|PM)/i, (match) => match.trim().toLowerCase());
    }
    
    const timePart = formatTime(timeStr);
    if (!timePart) return timeStr;
    
    const hourMatch = timePart.match(/^(\d{1,2})/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      if (hour >= 9 && hour <= 23) {
        return timePart + 'am';
      } else if (hour >= 1 && hour <= 8) {
        return timePart + 'am';
      } else {
        return timePart + 'am';
      }
    }
    
    return timeStr;
  };

  const calculateFoodReadyTime = (startTime: string): string => {
    if (!startTime) return '';
    
    const formattedTime = ensureAMPM(startTime);
    const timeMatch = formattedTime.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
    
    if (!timeMatch) return '';
    
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2] || '0');
    const period = timeMatch[3].toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    // Subtract 30 minutes
    let newMinutes = minutes - 30;
    let newHours = hours;
    
    if (newMinutes < 0) {
      newMinutes += 60;
      newHours -= 1;
    }
    
    if (newHours < 0) newHours += 24;
    
    // Convert back to 12-hour format
    let displayHours = newHours % 12;
    if (displayHours === 0) displayHours = 12;
    const displayPeriod = newHours >= 12 ? 'pm' : 'am';
    
    return `${displayHours}:${newMinutes.toString().padStart(2, '0')}${displayPeriod}`;
  };

  // Catering email generation
  const handleGenerateCatering = () => {
    if (!yourName || events.length === 0) {
      toast.error("Please enter your name and add at least one event");
      return;
    }

    for (const event of events) {
      if (!event.date || !event.startTime || !event.endTime || !event.guestCount || !event.location || !event.menuSelection) {
        toast.error("Please fill in all required fields for each event");
        return;
      }
    }

    let eventDetails = '';
    events.forEach((event, index) => {
      const foodReadyTime = calculateFoodReadyTime(event.startTime);
      eventDetails += `Event ${index + 1}:
Date: ${event.date ? format(event.date, 'MMMM d yyyy') : ''}
Food Ready by: ${foodReadyTime}
Guests Arrive: ${ensureAMPM(event.startTime)}
Event Conclusion: ${ensureAMPM(event.endTime)}
Guest Count: ${event.guestCount}
Location: ${event.location}
Occasion: ILC Outreach
Menu Selection: ${event.menuSelection}
Tables Available for Catering Set Up: Yes
Types of Tables for Guests: 6' by 2.5' card tables
CFOAPAL: ${import.meta.env.VITE_CFOAPAL}

`;
    });

    const contactsSection = `Contacts:
${yourName}${contactPhone ? `, ${contactPhone}` : ''}
${import.meta.env.VITE_SUPERVISOR_NAME}, ${import.meta.env.VITE_SUPERVISOR_PHONE}`;

    const email = `Subject: Illinois Leadership Center Outreach Events

Hello,

We would like to place catering orders for some upcoming outreach events. I have cc'd my supervisor on this email for his reference as well.

Here are the details for the events:

${eventDetails}
${contactsSection}

Thank you!

Best,
${yourName}
Illinois Leadership Center
Outreach Team`;

    setCateringGeneratedEmail(email);
    toast.success("Email generated!");
  };

  const copyCateringToClipboard = () => {
    if (!cateringGeneratedEmail) return;
    navigator.clipboard.writeText(cateringGeneratedEmail);
    toast.success("Copied to clipboard!");
  };

  const openCateringMailApp = () => {
    if (!recipientEmail) {
      toast.error("Please provide the recipient's email to open in Outlook");
      return;
    }

    if (!yourName || events.length === 0) {
      toast.error("Please enter your name and add at least one event");
      return;
    }

    for (const event of events) {
      if (!event.date || !event.startTime || !event.endTime || !event.guestCount || !event.location || !event.menuSelection) {
        toast.error("Please fill in all required fields for each event");
        return;
      }
    }

    // Generate the email body for mailto
    let eventDetails = '';
    events.forEach((event, index) => {
      const foodReadyTime = calculateFoodReadyTime(event.startTime);
      eventDetails += `Event ${index + 1}:
Date: ${event.date ? format(event.date, 'MMMM d yyyy') : ''}
Food Ready by: ${foodReadyTime}
Guests Arrive: ${ensureAMPM(event.startTime)}
Event Conclusion: ${ensureAMPM(event.endTime)}
Guest Count: ${event.guestCount}
Location: ${event.location}
Occasion: ILC Outreach
Menu Selection: ${event.menuSelection}
Tables Available for Catering Set Up: Yes
Types of Tables for Guests: 6' by 2.5' card tables
CFOAPAL: ${import.meta.env.VITE_CFOAPAL}

`;
    });

    const contactsSection = `Contacts:
${yourName}${contactPhone ? `, ${contactPhone}` : ''}
${import.meta.env.VITE_SUPERVISOR_NAME}, ${import.meta.env.VITE_SUPERVISOR_PHONE}`;

    const body = `Hello,

We would like to place catering orders for some upcoming outreach events. I have cc'd my supervisor on this email for his reference as well.

Here are the details for the events:

${eventDetails}
${contactsSection}

Thank you!

Best,
${yourName}
Illinois Leadership Center
Outreach Team`;

    const mailtoLink = `mailto:${encodeURIComponent(recipientEmail)}?cc=${encodeURIComponent(`${import.meta.env.VITE_SUPERVISOR_NAME} <${import.meta.env.VITE_SUPERVISOR_EMAIL}>`)}&subject=${encodeURIComponent(
      "Illinois Leadership Center Outreach Events"
    )}&body=${encodeURIComponent(body)}`;

    window.open(mailtoLink, "_blank");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Email Generator</h2>

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        {["presentations", "catering"].map(tab => (
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

      {/* Presentations Tab */}
      {activeTab === "presentations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instructorName">Instructor Name *</Label>
                <Input
                  id="instructorName"
                  placeholder="e.g., Professor XYZ"
                  value={presFormData.instructorName}
                  onChange={(e: { target: { value: any; }; }) => setPresFormData({ ...presFormData, instructorName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructorEmail">Instructor Email</Label>
                <Input
                  id="instructorEmail"
                  type="email"
                  placeholder="e.g., xyz@illinois.edu"
                  value={presFormData.instructorEmail}
                  onChange={(e) => setPresFormData({ ...presFormData, instructorEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yourName">Your Name *</Label>
                <Input
                  id="yourName"
                  placeholder="Enter your name"
                  value={presFormData.yourName}
                  onChange={(e) => setPresFormData({ ...presFormData, yourName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseNumber">Course Number *</Label>
                <Input
                  id="courseNumber"
                  placeholder="e.g., LEAD 260"
                  value={presFormData.courseNumber}
                  onChange={(e) => setPresFormData({ ...presFormData, courseNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseName">Course Name *</Label>
                <Input
                  id="courseName"
                  placeholder="e.g., Foundations of Leadership"
                  value={presFormData.courseName}
                  onChange={(e) => setPresFormData({ ...presFormData, courseName: e.target.value })}
                />
              </div>
              <Button onClick={handleGeneratePresentation} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" /> Generate Email
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Generated Draft</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4">
              <Textarea
                className="flex-1 min-h-[300px] font-mono text-sm"
                value={presGeneratedEmail}
                onChange={(e) => setPresGeneratedEmail(e.target.value)}
                placeholder="Your generated email will appear here."
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setPresGeneratedEmail('')}>Clear</Button>
                <Button onClick={copyPresToClipboard} disabled={!presGeneratedEmail}>
                  <Copy className="mr-2 h-4 w-4" /> Copy Text
                </Button>
                <Button onClick={openMailApp} disabled={!presGeneratedEmail || !presFormData.instructorEmail}>
                  Open in Outlook
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Catering Tab */}
      {activeTab === "catering" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cateringYourName">Your Name *</Label>
                  <Input
                    id="cateringYourName"
                    placeholder="Enter your name"
                    value={yourName}
                    onChange={(e) => setYourName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Your Phone</Label>
                  <Input
                    id="contactPhone"
                    placeholder="e.g., xxx-xxx-xxxx"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Recipient Email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="e.g., catering@illinois.edu"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Events</CardTitle>
                  <Button onClick={addEvent} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No events added yet. Click "Add Event" to get started.</p>
                ) : (
                  events.map((event, index) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Event {index + 1}</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeEvent(event.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Date *</Label>
                        <Popover 
                          open={isCalendarOpen[event.id]} 
                          onOpenChange={(open) => setIsCalendarOpen({ ...isCalendarOpen, [event.id]: open })}
                        >
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !event.date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {event.date ? format(event.date, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={event.date}
                              onSelect={(date) => {
                                if (date) updateEvent(event.id, 'date', date);
                                setIsCalendarOpen({ ...isCalendarOpen, [event.id]: false });
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Start Time *</Label>
                        <Input
                          placeholder="e.g., 11:00 AM"
                          value={event.startTime}
                          onChange={(e) => updateEvent(event.id, 'startTime', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>End Time *</Label>
                        <Input
                          placeholder="e.g., 1:00 PM"
                          value={event.endTime}
                          onChange={(e) => updateEvent(event.id, 'endTime', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Guest Count *</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 75"
                          value={event.guestCount || ''}
                          onChange={(e) => updateEvent(event.id, 'guestCount', parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Location *</Label>
                        <Input
                          placeholder="e.g., Southwest Foyer, Illini Union"
                          value={event.location}
                          onChange={(e) => updateEvent(event.id, 'location', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Menu Selection *</Label>
                        <Textarea
                          placeholder="e.g., Cookies (no oatmeal raisin), Hot Chocolate"
                          value={event.menuSelection}
                          onChange={(e) => updateEvent(event.id, 'menuSelection', e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  ))
                )}
                
                {events.length > 0 && (
                  <Button onClick={handleGenerateCatering} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" /> Generate Email
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Generated Draft</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4">
              <Textarea
                className="flex-1 min-h-[500px] font-mono text-sm"
                value={cateringGeneratedEmail}
                onChange={(e) => setCateringGeneratedEmail(e.target.value)}
                placeholder="Your generated email will appear here."
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCateringGeneratedEmail('')}>Clear</Button>
                <Button onClick={copyCateringToClipboard} disabled={!cateringGeneratedEmail}>
                  <Copy className="mr-2 h-4 w-4" /> Copy Text
                </Button>
                <Button onClick={openCateringMailApp} disabled={!cateringGeneratedEmail || !recipientEmail}>
                  Open in Outlook
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
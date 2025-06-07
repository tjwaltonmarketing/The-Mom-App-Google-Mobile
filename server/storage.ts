import { 
  familyMembers, 
  events, 
  tasks, 
  voiceNotes, 
  deadlines,
  type FamilyMember, 
  type InsertFamilyMember,
  type Event,
  type InsertEvent,
  type Task,
  type InsertTask,
  type VoiceNote,
  type InsertVoiceNote,
  type Deadline,
  type InsertDeadline
} from "@shared/schema";

export interface IStorage {
  // Family Members
  getFamilyMembers(): Promise<FamilyMember[]>;
  getFamilyMember(id: number): Promise<FamilyMember | undefined>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  
  // Events
  getEvents(): Promise<Event[]>;
  getTodayEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  
  // Tasks
  getTasks(): Promise<Task[]>;
  getTasksForToday(): Promise<Task[]>;
  getPendingTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  completeTask(id: number, completedBy: number): Promise<Task | undefined>;
  
  // Voice Notes
  getVoiceNotes(): Promise<VoiceNote[]>;
  getRecentVoiceNotes(): Promise<VoiceNote[]>;
  createVoiceNote(note: InsertVoiceNote): Promise<VoiceNote>;
  
  // Deadlines
  getDeadlines(): Promise<Deadline[]>;
  getUpcomingDeadlines(): Promise<Deadline[]>;
  createDeadline(deadline: InsertDeadline): Promise<Deadline>;
}

export class MemStorage implements IStorage {
  private familyMembers: Map<number, FamilyMember>;
  private events: Map<number, Event>;
  private tasks: Map<number, Task>;
  private voiceNotes: Map<number, VoiceNote>;
  private deadlines: Map<number, Deadline>;
  
  private currentFamilyMemberId: number;
  private currentEventId: number;
  private currentTaskId: number;
  private currentVoiceNoteId: number;
  private currentDeadlineId: number;

  constructor() {
    this.familyMembers = new Map();
    this.events = new Map();
    this.tasks = new Map();
    this.voiceNotes = new Map();
    this.deadlines = new Map();
    
    this.currentFamilyMemberId = 1;
    this.currentEventId = 1;
    this.currentTaskId = 1;
    this.currentVoiceNoteId = 1;
    this.currentDeadlineId = 1;
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize family members
    const mom: FamilyMember = {
      id: 1,
      name: "Mom",
      role: "mom",
      color: "#E53E3E",
      avatar: "M"
    };
    
    const dad: FamilyMember = {
      id: 2,
      name: "Dad",
      role: "dad",
      color: "#3182CE",
      avatar: "D"
    };
    
    const emma: FamilyMember = {
      id: 3,
      name: "Emma",
      role: "child",
      color: "#38A169",
      avatar: "E"
    };
    
    const sam: FamilyMember = {
      id: 4,
      name: "Sam",
      role: "child",
      color: "#9F7AEA",
      avatar: "S"
    };

    this.familyMembers.set(1, mom);
    this.familyMembers.set(2, dad);
    this.familyMembers.set(3, emma);
    this.familyMembers.set(4, sam);
    this.currentFamilyMemberId = 5;

    // Initialize today's events
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    this.events.set(1, {
      id: 1,
      title: "Emma's Soccer Practice",
      description: "Riverside Park - Don't forget cleats!",
      startTime: new Date(todayStart.getTime() + 8 * 60 * 60 * 1000), // 8 AM
      endTime: new Date(todayStart.getTime() + 10 * 60 * 60 * 1000), // 10 AM
      location: "Riverside Park",
      assignedTo: 3,
      isAllDay: false
    });

    this.events.set(2, {
      id: 2,
      title: "Parent-Teacher Conference",
      description: "Sam's school - Room 205",
      startTime: new Date(todayStart.getTime() + 14 * 60 * 60 * 1000), // 2 PM
      endTime: new Date(todayStart.getTime() + 15 * 60 * 60 * 1000), // 3 PM
      location: "Sam's school - Room 205",
      assignedTo: 1,
      isAllDay: false
    });

    this.events.set(3, {
      id: 3,
      title: "Family Movie Night",
      description: "Living room - Emma's turn to pick!",
      startTime: new Date(todayStart.getTime() + 19 * 60 * 60 * 1000), // 7 PM
      endTime: new Date(todayStart.getTime() + 21 * 60 * 60 * 1000), // 9 PM
      location: "Living room",
      assignedTo: 2,
      isAllDay: false
    });

    this.currentEventId = 4;

    // Initialize tasks
    this.tasks.set(1, {
      id: 1,
      title: "Buy groceries for dinner",
      description: "Check the meal plan for tonight",
      isCompleted: false,
      priority: "high",
      dueDate: new Date(todayStart.getTime() + 12 * 60 * 60 * 1000), // noon today
      assignedTo: 1,
      completedBy: null,
      completedAt: null
    });

    this.tasks.set(2, {
      id: 2,
      title: "Pick up dry cleaning",
      description: "Dad's work shirts",
      isCompleted: false,
      priority: "medium",
      dueDate: new Date(todayStart.getTime() + 17 * 60 * 60 * 1000), // 5 PM today
      assignedTo: 2,
      completedBy: null,
      completedAt: null
    });

    this.tasks.set(3, {
      id: 3,
      title: "Pack Emma's soccer bag",
      description: "Cleats, water bottle, shin guards",
      isCompleted: true,
      priority: "high",
      dueDate: new Date(todayStart.getTime() + 7 * 60 * 60 * 1000), // 7 AM today
      assignedTo: 2,
      completedBy: 2,
      completedAt: new Date(todayStart.getTime() + 6 * 60 * 60 * 1000) // 6 AM today
    });

    this.currentTaskId = 4;

    // Initialize voice notes
    this.voiceNotes.set(1, {
      id: 1,
      content: "Need to remember Emma has early dismissal tomorrow for the field trip. Also pick up Sam's prescription and call the dentist about his appointment next week.",
      transcription: "Need to remember Emma has early dismissal tomorrow for the field trip. Also pick up Sam's prescription and call the dentist about his appointment next week.",
      createdBy: 1,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      isProcessed: false
    });

    this.currentVoiceNoteId = 2;

    // Initialize deadlines
    const tomorrow = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const friday = new Date(todayStart.getTime() + (5 - todayStart.getDay()) * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.deadlines.set(1, {
      id: 1,
      title: "Emma's science project",
      description: "Solar system model",
      dueDate: tomorrow,
      priority: "high",
      isCompleted: false,
      relatedTo: 3
    });

    this.deadlines.set(2, {
      id: 2,
      title: "School permission slip",
      description: "Field trip permission form",
      dueDate: friday,
      priority: "medium",
      isCompleted: false,
      relatedTo: 4
    });

    this.deadlines.set(3, {
      id: 3,
      title: "Annual checkups",
      description: "Schedule doctor appointments for all family members",
      dueDate: monthEnd,
      priority: "medium",
      isCompleted: false,
      relatedTo: 1
    });

    this.currentDeadlineId = 4;
  }

  // Family Members
  async getFamilyMembers(): Promise<FamilyMember[]> {
    return Array.from(this.familyMembers.values());
  }

  async getFamilyMember(id: number): Promise<FamilyMember | undefined> {
    return this.familyMembers.get(id);
  }

  async createFamilyMember(insertMember: InsertFamilyMember): Promise<FamilyMember> {
    const id = this.currentFamilyMemberId++;
    const member: FamilyMember = { ...insertMember, id };
    this.familyMembers.set(id, member);
    return member;
  }

  // Events
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getTodayEvents(): Promise<Event[]> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    return Array.from(this.events.values()).filter(event => 
      event.startTime >= todayStart && event.startTime < todayEnd
    );
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.currentEventId++;
    const event: Event = { ...insertEvent, id };
    this.events.set(id, event);
    return event;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTasksForToday(): Promise<Task[]> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    return Array.from(this.tasks.values()).filter(task => 
      task.dueDate && task.dueDate >= todayStart && task.dueDate < todayEnd
    );
  }

  async getPendingTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => !task.isCompleted);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = { 
      ...insertTask, 
      id,
      completedBy: null,
      completedAt: null
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async completeTask(id: number, completedBy: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { 
      ...task, 
      isCompleted: true, 
      completedBy,
      completedAt: new Date()
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Voice Notes
  async getVoiceNotes(): Promise<VoiceNote[]> {
    return Array.from(this.voiceNotes.values());
  }

  async getRecentVoiceNotes(): Promise<VoiceNote[]> {
    const notes = Array.from(this.voiceNotes.values());
    return notes
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 5);
  }

  async createVoiceNote(insertNote: InsertVoiceNote): Promise<VoiceNote> {
    const id = this.currentVoiceNoteId++;
    const note: VoiceNote = { 
      ...insertNote, 
      id,
      createdAt: new Date(),
      isProcessed: false
    };
    this.voiceNotes.set(id, note);
    return note;
  }

  // Deadlines
  async getDeadlines(): Promise<Deadline[]> {
    return Array.from(this.deadlines.values());
  }

  async getUpcomingDeadlines(): Promise<Deadline[]> {
    const now = new Date();
    return Array.from(this.deadlines.values())
      .filter(deadline => !deadline.isCompleted && deadline.dueDate > now)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async createDeadline(insertDeadline: InsertDeadline): Promise<Deadline> {
    const id = this.currentDeadlineId++;
    const deadline: Deadline = { ...insertDeadline, id };
    this.deadlines.set(id, deadline);
    return deadline;
  }
}

export const storage = new MemStorage();

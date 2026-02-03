import { 
  familyMembers, 
  events, 
  tasks, 
  voiceNotes, 
  textNotes,
  deadlines,
  notifications,
  pushTokens,
  userSubscriptions,
  referralShares,
  passwords,
  passwordResetTokens,
  groceryItems,
  mealPlans,
  householdSettings,
  users,
  families,
  familyMemberships,
  familyInvites,
  teenProfiles,
  teenNotificationSettings,
  teenTaskHistory,
  teenNotificationLog,
  childProfiles,
  parentTaskCompletions,
  feedbackPrompts,
  featureRequests,
  type FamilyMember, 
  type InsertFamilyMember,
  type Event,
  type InsertEvent,
  type Task,
  type InsertTask,
  type VoiceNote,
  type InsertVoiceNote,
  type TextNote,
  type InsertTextNote,
  type Deadline,
  type InsertDeadline,
  type Notification,
  type InsertNotification,
  type PushToken,
  type InsertPushToken,
  type UserSubscription,
  type InsertUserSubscription,
  type ReferralShare,
  type InsertReferralShare,
  type Password,
  type InsertPassword,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type GroceryItem,
  type InsertGroceryItem,
  type MealPlan,
  type InsertMealPlan,
  type User,
  type InsertUser,
  type Family,
  type InsertFamily,
  type FamilyMembership,
  type InsertFamilyMembership,
  type FamilyInvite,
  type InsertFamilyInvite,
  type TeenProfile,
  type InsertTeenProfile,
  type TeenNotificationSettings,
  type InsertTeenNotificationSettings,
  type TeenTaskHistory,
  type InsertTeenTaskHistory,
  type TeenNotificationLog,
  type InsertTeenNotificationLog,
  type HouseholdSettings,
  type InsertHouseholdSettings,
  type ChildProfile,
  type InsertChildProfile,
  type ParentTaskCompletion,
  type InsertParentTaskCompletion,
  type FeedbackPrompt,
  type InsertFeedbackPrompt,
  type FeatureRequest,
  type InsertFeatureRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lt, desc, isNull, or, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User Authentication
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: number, passwordHash: string): Promise<User | undefined>;
  updateUserProfile(userId: number, updates: { firstName?: string; lastName?: string }): Promise<User | undefined>;
  deleteUserAccount(userId: number): Promise<void>;
  
  // Replit Auth Methods
  getUserByReplitId(replitUserId: string): Promise<User | undefined>;
  updateUserWithReplitAuth(userId: number, replitData: {
    replitUserId: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    authMethod: string;
  }): Promise<User>;
  createReplitUser(userData: {
    email: string;
    replitUserId: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    authMethod: string;
  }): Promise<User>;
  
  // Trial and Subscription Management
  initializeUserTrial(userId: number): Promise<User | undefined>;
  getUserTrialStatus(userId: number): Promise<{ isActive: boolean; daysRemaining: number; expiresAt: Date | null }>;
  updateUserSubscription(userId: number, updates: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined>;
  
  // Password Reset
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(tokenId: number): Promise<void>;
  
  // Teen Security Questions for Password Reset
  setTeenSecurityQuestions(teenId: number, question1: string, answer1: string, question2: string, answer2: string): Promise<TeenProfile | undefined>;
  verifyTeenSecurityAnswers(userId: number, answer1: string, answer2: string): Promise<boolean>;
  
  // SMS Password Reset for Parents
  createSMSPasswordResetToken(userId: number, phoneNumber: string, token: string): Promise<PasswordResetToken>;
  getFamilyMemberPhoneNumber(userId: number): Promise<string | undefined>;
  
  // Family Management
  createFamily(family: InsertFamily): Promise<Family>;
  getFamilyByUserId(userId: number): Promise<Family | undefined>;
  getUserFamily(userId: number): Promise<Family | undefined>;
  updateUserFamily(userId: number, familyId: number): Promise<void>;
  updateFamily(familyId: number, updates: { name?: string }): Promise<Family | undefined>;
  moveEventsToFamily(fromFamilyId: number, toFamilyId: number): Promise<void>;
  moveTasksToFamily(fromFamilyId: number, toFamilyId: number): Promise<void>;
  
  // Family Merge Requests
  createFamilyMergeRequest(partnerEmail: string, requesterId: number): Promise<{ success: boolean; message: string }>;
  createFamilyMergeRequestByPhone(partnerPhone: string, requesterId: number): Promise<{ success: boolean; message: string }>;
  getFamilyMergeRequestsForUser(userEmail: string): Promise<any[]>;
  approveFamilyMergeRequest(requestId: number, partnerId: number): Promise<{ success: boolean; message: string }>;
  rejectFamilyMergeRequest(requestId: number): Promise<{ success: boolean; message: string }>;
  
  // Family Memberships
  createFamilyMembership(membership: InsertFamilyMembership): Promise<FamilyMembership>;
  getUserFamilyMembership(userId: number): Promise<FamilyMembership | undefined>;
  
  // Family Members
  getFamilyMembers(): Promise<FamilyMember[]>;
  getFamilyMembersByFamily(familyId: number): Promise<FamilyMember[]>;
  getFamilyMemberByUserId(userId: number): Promise<FamilyMember | undefined>;
  getFamilyMembersByFamilyId(familyId: number): Promise<FamilyMember[]>;
  getFamilyMember(id: number): Promise<FamilyMember | undefined>;
  getFamilyMemberById(id: number): Promise<FamilyMember | undefined>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: number, updates: Partial<InsertFamilyMember>): Promise<FamilyMember | undefined>;
  deleteFamilyMember(id: number): Promise<boolean>;
  linkFamilyMemberToUser(familyMemberId: number, userId: number): Promise<FamilyMember | undefined>;
  createParentInvite(email: string, familyId: number, role: "mom" | "dad" | "parent"): Promise<string>;
  
  // Kid Points Management (for child and teen roles)
  getKidsWithPoints(familyId: number): Promise<FamilyMember[]>;
  addKidPoints(familyMemberId: number, points: number): Promise<FamilyMember | undefined>;
  deductKidPoints(familyMemberId: number, points: number): Promise<FamilyMember | undefined>;
  resetKidPoints(familyMemberId: number): Promise<FamilyMember | undefined>;
  
  // Events
  getEvents(): Promise<Event[]>;
  getEventsByFamily(familyId: number, expandRecurrences?: boolean): Promise<Event[]>;
  getTodayEvents(): Promise<Event[]>;
  getTodayEventsByFamily(familyId: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  deleteAllEvents(familyId: number): Promise<boolean>;
  
  // Tasks
  getTasks(): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  getTasksByFamily(familyId: number): Promise<Task[]>;
  getTasksForToday(): Promise<Task[]>;
  getTasksForTodayByFamily(familyId: number): Promise<Task[]>;
  getPendingTasks(): Promise<Task[]>;
  getPendingTasksByFamily(familyId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  completeTask(id: number, completedBy: number): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  deleteAllTasks(): Promise<boolean>;
  deleteTasksByScope(currentMemberId: number, familyId: number, scope: 'self' | 'teens' | 'children' | 'all' | 'completed'): Promise<boolean>;
  getTasksForTeen(teenId: number): Promise<Task[]>;
  assignTaskToTeen(taskId: number, teenId: number): Promise<Task>;
  
  // Family Invites
  createFamilyInvite(invite: InsertFamilyInvite): Promise<FamilyInvite>;
  getFamilyInvite(inviteCode: string): Promise<FamilyInvite | undefined>;
  updateFamilyInvite(inviteCode: string, updates: Partial<FamilyInvite>): Promise<FamilyInvite | undefined>;
  
  // Voice Notes
  getVoiceNotes(): Promise<VoiceNote[]>;
  getRecentVoiceNotes(): Promise<VoiceNote[]>;
  getRecentVoiceNotesByFamily(familyId: number): Promise<VoiceNote[]>;
  createVoiceNote(note: InsertVoiceNote): Promise<VoiceNote>;
  
  // Text Notes
  getTextNotes(): Promise<TextNote[]>;
  getTextNotesByUser(userId: number): Promise<TextNote[]>;
  getTextNoteById(id: number, userId: number): Promise<TextNote | undefined>;
  createTextNote(note: InsertTextNote): Promise<TextNote>;
  updateTextNote(id: number, updates: Partial<InsertTextNote>, userId: number): Promise<TextNote | undefined>;
  deleteTextNote(id: number, userId: number): Promise<boolean>;
  
  // Deadlines
  getDeadlines(): Promise<Deadline[]>;
  getUpcomingDeadlines(): Promise<Deadline[]>;
  createDeadline(deadline: InsertDeadline): Promise<Deadline>;
  
  // Notifications
  getNotifications(recipientId?: number): Promise<Notification[]>;
  getPendingNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationSent(id: number): Promise<void>;
  deleteNotification(id: number): Promise<boolean>;
  clearAllNotificationsByFamily(familyId: number): Promise<number>;
  
  // Push Tokens
  createPushToken(pushToken: InsertPushToken): Promise<PushToken>;
  getPushTokensByUser(userId: number): Promise<PushToken[]>;
  updatePushToken(tokenId: number, updates: Partial<InsertPushToken>): Promise<PushToken | undefined>;
  deletePushToken(tokenId: number): Promise<boolean>;
  getPushTokensByFamily(familyId: number): Promise<PushToken[]>;

  // User Subscriptions
  getUserSubscription(userId: number): Promise<UserSubscription | undefined>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(userId: number, updates: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined>;

  // Referral Shares (for analytics)
  createReferralShare(share: InsertReferralShare): Promise<ReferralShare>;
  getReferralSharesByUser(userId: number): Promise<ReferralShare[]>;
  getReferralShareStats(): Promise<{ total: number; shared: number; skipped: number }>;

  // Passwords
  getPasswords(): Promise<Password[]>;
  createPassword(password: InsertPassword): Promise<Password>;
  updatePasswordSharing(id: number, sharedWith: number[]): Promise<Password | undefined>;
  getPasswordsByCreator(creatorId: number): Promise<Password[]>;
  getPasswordById(id: number): Promise<Password | undefined>;
  updatePassword(id: number, updates: Partial<InsertPassword>): Promise<Password | undefined>;
  deletePassword(id: number): Promise<boolean>;
  deletePasswordsByCreator(creatorId: number): Promise<number>;
  deletePasswordsByFamily(familyId: number): Promise<number>;
  
  // Grocery Lists
  getGroceryItems(): Promise<GroceryItem[]>;
  getGroceryItemsByFamily(familyId: number): Promise<GroceryItem[]>;
  createGroceryItem(item: InsertGroceryItem): Promise<GroceryItem>;
  updateGroceryItem(id: number, updates: Partial<GroceryItem>): Promise<GroceryItem | undefined>;
  
  // Meal Plans
  getMealPlans(): Promise<MealPlan[]>;
  getWeeklyMealPlans(): Promise<MealPlan[]>;
  createMealPlan(plan: InsertMealPlan): Promise<MealPlan>;
  createMealPlanForFamily(plan: InsertMealPlan, familyId: number): Promise<MealPlan>;
  getMealPlansByFamily(familyId: number): Promise<MealPlan[]>;
  updateMealPlan(id: number, updates: Partial<InsertMealPlan>): Promise<MealPlan | undefined>;
  deleteMealPlan(id: number): Promise<boolean>;
  deleteAllMealPlans(): Promise<number>;

  // Household Settings
  getHouseholdSettings(familyId: number): Promise<HouseholdSettings | undefined>;
  updateDishwasherStatus(familyId: number, isClean: boolean, updatedBy: number): Promise<HouseholdSettings>;

  // Teen Account System
  createFamilyInvite(invite: InsertFamilyInvite): Promise<FamilyInvite>;
  getFamilyInvite(inviteCode: string): Promise<FamilyInvite | undefined>;
  acceptFamilyInvite(inviteCode: string, acceptedBy: number): Promise<FamilyInvite | undefined>;
  getFamilyInvites(familyId: number): Promise<FamilyInvite[]>;
  
  createTeenProfile(profile: InsertTeenProfile): Promise<TeenProfile>;
  getTeenProfile(teenId: number): Promise<TeenProfile | undefined>;
  getTeenProfileByUserId(userId: number): Promise<TeenProfile | undefined>;
  getTeenProfileByUsername(username: string): Promise<TeenProfile | undefined>;
  getTeenProfileByFamilyMemberId(familyMemberId: number): Promise<TeenProfile | undefined>;
  updateTeenPoints(teenProfileId: number, points: number): Promise<void>;
  updateTeenStreak(teenProfileId: number, streak: number): Promise<void>;
  updateTeenProfile(teenId: number, updates: Partial<InsertTeenProfile>): Promise<TeenProfile | undefined>;
  deleteTeenProfile(teenProfileId: number): Promise<boolean>;
  deleteUserById(userId: number): Promise<boolean>;
  
  createTeenNotificationSettings(settings: InsertTeenNotificationSettings): Promise<TeenNotificationSettings>;
  getTeenNotificationSettings(teenProfileId: number): Promise<TeenNotificationSettings | undefined>;
  updateTeenNotificationSettings(teenProfileId: number, settings: Partial<TeenNotificationSettings>): Promise<void>;
  
  getTeenTasks(teenProfileId: number): Promise<Task[]>;
  getTeenStats(teenProfileId: number): Promise<{ weeklyPoints: number; streak: number; completedToday: number }>;
  completeTeenTask(taskId: number, teenProfileId: number): Promise<{ task: Task; pointsEarned: number }>;
  
  createTeenTaskHistory(history: InsertTeenTaskHistory): Promise<TeenTaskHistory>;
  logTeenNotification(log: InsertTeenNotificationLog): Promise<TeenNotificationLog>;
  
  // Additional methods for notifications
  getTask(id: number): Promise<Task | undefined>;
  getTasksForTeen(teenProfileId: number): Promise<Task[]>;
  
  // Child Profile System
  createChildProfile(profile: InsertChildProfile, parentFamilyMemberId: number): Promise<ChildProfile>;
  getChildProfile(childProfileId: number, parentFamilyMemberId: number): Promise<ChildProfile | undefined>;
  getChildProfilesByFamily(familyId: number, parentFamilyMemberId: number): Promise<ChildProfile[]>;
  getChildProfileByFamilyMember(familyMemberId: number, parentFamilyMemberId: number): Promise<ChildProfile | undefined>;
  updateChildProfile(childProfileId: number, updates: Partial<InsertChildProfile>, parentFamilyMemberId: number): Promise<ChildProfile | undefined>;
  deleteChildProfile(childProfileId: number, parentFamilyMemberId: number): Promise<boolean>;
  
  // Parent Task Completion for Children
  createParentTaskCompletion(taskId: number, childProfileId: number, parentFamilyMemberId: number, notes?: string): Promise<ParentTaskCompletion>;
  getParentTaskCompletions(childProfileId: number, parentFamilyMemberId: number): Promise<ParentTaskCompletion[]>;
  getTasksForChild(childProfileId: number, parentFamilyMemberId: number): Promise<Task[]>;
  completeTaskForChild(taskId: number, childProfileId: number, parentFamilyMemberId: number, notes?: string): Promise<Task>;

  // Feedback Prompts
  shouldShowFeedbackPrompt(userId: number): Promise<boolean>;
  createFeedbackPrompt(userId: number, promptType: string): Promise<FeedbackPrompt>;
  updateFeedbackPromptResponse(userId: number, response: string, feedbackText?: string, reviewRequested?: boolean, remindLater?: boolean): Promise<FeedbackPrompt | undefined>;
  getPendingFeedbackPrompt(userId: number): Promise<FeedbackPrompt | undefined>;

  // Feature Requests / User Feedback
  createFeatureRequest(request: InsertFeatureRequest): Promise<FeatureRequest>;
}

export class DatabaseStorage implements IStorage {
  // User Authentication Methods
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProfile(userId: number, updates: { firstName?: string; lastName?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUserAccount(userId: number): Promise<void> {
    // Get user's family membership
    const membership = await this.getUserFamilyMembership(userId);
    
    if (membership) {
      const familyId = membership.familyId;
      
      // Delete all family data
      await db.delete(tasks).where(eq(tasks.familyId, familyId));
      await db.delete(events).where(eq(events.familyId, familyId));
      await db.delete(voiceNotes).where(eq(voiceNotes.familyId, familyId));
      await db.delete(notifications).where(eq(notifications.familyId, familyId));
      await db.delete(groceryItems).where(eq(groceryItems.familyId, familyId));
      await db.delete(mealPlans).where(eq(mealPlans.familyId, familyId));
      await db.delete(notes).where(eq(notes.familyId, familyId));
      await db.delete(passwords).where(eq(passwords.familyId, familyId));
      await db.delete(familyInvites).where(eq(familyInvites.familyId, familyId));
      await db.delete(householdSettings).where(eq(householdSettings.familyId, familyId));
      
      // Delete family members and their linked data
      const members = await this.getFamilyMembersByFamily(familyId);
      for (const member of members) {
        if (member.userId && member.userId !== userId) {
          // Delete linked user accounts for teens
          const teenProfile = await db.select().from(teenProfiles).where(eq(teenProfiles.userId, member.userId));
          if (teenProfile.length > 0) {
            await db.delete(teenNotificationSettings).where(eq(teenNotificationSettings.teenId, teenProfile[0].id));
            await db.delete(teenProfiles).where(eq(teenProfiles.userId, member.userId));
          }
          await db.delete(familyMemberships).where(eq(familyMemberships.userId, member.userId));
          await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, member.userId));
          await db.delete(users).where(eq(users.id, member.userId));
        }
      }
      
      // Delete family members
      await db.delete(familyMembers).where(eq(familyMembers.familyId, familyId));
      
      // Delete family memberships
      await db.delete(familyMemberships).where(eq(familyMemberships.familyId, familyId));
      
      // Delete family
      await db.delete(families).where(eq(families.id, familyId));
    }
    
    // Delete user subscription
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    
    // Delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  // Replit Auth Methods
  async getUserByReplitId(replitUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.replitUserId, replitUserId));
    return user || undefined;
  }

  async updateUserWithReplitAuth(userId: number, replitData: {
    replitUserId: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    authMethod: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        ...replitData,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createReplitUser(userData: {
    email: string;
    replitUserId: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    authMethod: string;
  }): Promise<User> {
    const [user] = await db.insert(users).values({
      ...userData,
      isVerified: true, // Replit Auth users are pre-verified
    }).returning();
    return user;
  }

  async createPasswordResetToken(insertToken: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db
      .insert(passwordResetTokens)
      .values(insertToken)
      .returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.isUsed, false),
        gte(passwordResetTokens.expiresAt, new Date())
      ));
    return resetToken;
  }

  async markPasswordResetTokenUsed(tokenId: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ isUsed: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  // Teen Security Questions for Password Reset
  async setTeenSecurityQuestions(teenId: number, question1: string, answer1: string, question2: string, answer2: string): Promise<TeenProfile | undefined> {
    const [profile] = await db
      .update(teenProfiles)
      .set({
        securityQuestion1: question1,
        securityAnswer1: answer1,
        securityQuestion2: question2,
        securityAnswer2: answer2,
      })
      .where(eq(teenProfiles.id, teenId))
      .returning();
    return profile || undefined;
  }

  async verifyTeenSecurityAnswers(userId: number, answer1: string, answer2: string): Promise<boolean> {
    const [profile] = await db
      .select()
      .from(teenProfiles)
      .where(eq(teenProfiles.userId, userId));
    
    if (!profile || !profile.securityAnswer1 || !profile.securityAnswer2) {
      return false;
    }
    
    // Case-insensitive comparison
    const isAnswer1Correct = profile.securityAnswer1.toLowerCase().trim() === answer1.toLowerCase().trim();
    const isAnswer2Correct = profile.securityAnswer2.toLowerCase().trim() === answer2.toLowerCase().trim();
    
    return isAnswer1Correct && isAnswer2Correct;
  }

  // SMS Password Reset for Parents
  async createSMSPasswordResetToken(userId: number, phoneNumber: string, token: string): Promise<PasswordResetToken> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({
        userId: userId,
        token: token,
        expiresAt: expiresAt,
        resetType: "sms",
        phoneNumber: phoneNumber,
        isUsed: false,
      })
      .returning();
    return resetToken;
  }

  async getFamilyMemberPhoneNumber(userId: number): Promise<string | undefined> {
    const [member] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId));
    
    return member?.phone || undefined;
  }

  // Trial and Subscription Management using separate table
  async initializeUserTrial(userId: number): Promise<User | undefined> {
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial

    // Create subscription record in separate table
    try {
      await db.insert(userSubscriptions).values({
        userId,
        trialStartDate,
        trialEndDate,
        subscriptionPlan: "trial",
        subscriptionStatus: "active"
      });
    } catch (error) {
      console.log("Trial already exists or error:", error);
    }

    // Return the user
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async getUserTrialStatus(userId: number): Promise<{ isActive: boolean; daysRemaining: number; expiresAt: Date | null }> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    
    if (!subscription || !subscription.trialEndDate) {
      return { isActive: false, daysRemaining: 0, expiresAt: null };
    }

    const now = new Date();
    const expiresAt = subscription.trialEndDate;
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const isActive = now < expiresAt && subscription.subscriptionStatus === "active";

    return { isActive, daysRemaining, expiresAt };
  }


  // Family Management Methods
  async createFamily(insertFamily: InsertFamily): Promise<Family> {
    const [family] = await db.insert(families).values(insertFamily).returning();
    return family;
  }

  async getFamilyByUserId(userId: number): Promise<Family | undefined> {
    const [membership] = await db
      .select()
      .from(familyMemberships)
      .where(eq(familyMemberships.userId, userId))
      .limit(1);
    
    if (!membership) return undefined;
    
    const [family] = await db
      .select()
      .from(families)
      .where(eq(families.id, membership.familyId));
    
    return family || undefined;
  }

  async getUserFamily(userId: number): Promise<Family | undefined> {
    return this.getFamilyByUserId(userId);
  }

  async updateUserFamily(userId: number, familyId: number): Promise<void> {
    await db
      .update(familyMemberships)
      .set({ familyId })
      .where(eq(familyMemberships.userId, userId));
  }

  async updateFamily(familyId: number, updates: { name?: string }): Promise<Family | undefined> {
    const [updated] = await db
      .update(families)
      .set(updates)
      .where(eq(families.id, familyId))
      .returning();
    return updated || undefined;
  }

  async moveEventsToFamily(fromFamilyId: number, toFamilyId: number): Promise<void> {
    // Move all events from one family to another - update family ID instead of assignedTo
    await db
      .update(events)
      .set({ familyId: toFamilyId })
      .where(eq(events.familyId, fromFamilyId));
  }

  async moveTasksToFamily(fromFamilyId: number, toFamilyId: number): Promise<void> {
    // Move all tasks from one family to another
    const membersFromFamily = await this.getFamilyMembersByFamilyId(fromFamilyId);
    const membersToFamily = await this.getFamilyMembersByFamilyId(toFamilyId);
    
    // For simplicity, reassign tasks to the first member of the target family
    const targetMember = membersToFamily[0];
    if (targetMember) {
      for (const member of membersFromFamily) {
        await db
          .update(tasks)
          .set({ assignedTo: targetMember.id })
          .where(eq(tasks.assignedTo, member.id));
      }
    }
  }

  async createFamilyMembership(insertMembership: InsertFamilyMembership): Promise<FamilyMembership> {
    const [membership] = await db.insert(familyMemberships).values(insertMembership).returning();
    return membership;
  }

  async getFamilyMembers(): Promise<FamilyMember[]> {
    return await db.select().from(familyMembers).where(eq(familyMembers.isActive, true));
  }

  async getFamilyMembersByFamily(familyId: number): Promise<FamilyMember[]> {
    return await db.select().from(familyMembers)
      .where(and(
        eq(familyMembers.familyId, familyId),
        eq(familyMembers.isActive, true)
      ));
  }

  async getFamilyMembersByFamilyId(familyId: number): Promise<FamilyMember[]> {
    return this.getFamilyMembersByFamily(familyId);
  }

  async getFamilyMember(id: number): Promise<FamilyMember | undefined> {
    const [member] = await db.select().from(familyMembers).where(eq(familyMembers.id, id));
    return member || undefined;
  }

  async getFamilyMemberById(id: number): Promise<FamilyMember | undefined> {
    return this.getFamilyMember(id);
  }

  async getFamilyMemberByUserId(userId: number): Promise<FamilyMember | undefined> {
    const [member] = await db.select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId))
      .limit(1);
    return member || undefined;
  }

  async createFamilyMember(insertMember: InsertFamilyMember): Promise<FamilyMember> {
    const [member] = await db.insert(familyMembers).values(insertMember).returning();
    return member;
  }

  async updateFamilyMember(id: number, updates: Partial<InsertFamilyMember>): Promise<FamilyMember | undefined> {
    const [member] = await db
      .update(familyMembers)
      .set(updates)
      .where(eq(familyMembers.id, id))
      .returning();
    return member;
  }

  async deleteFamilyMember(id: number): Promise<boolean> {
    try {
      // First, delete related records to avoid foreign key constraint violations
      await db.delete(deadlines).where(eq(deadlines.relatedTo, id));
      await db.delete(notifications).where(eq(notifications.recipientId, id));
      await db.delete(tasks).where(eq(tasks.assignedTo, id));
      await db.delete(tasks).where(eq(tasks.completedBy, id));
      await db.delete(childProfiles).where(eq(childProfiles.familyMemberId, id));
      await db.delete(parentTaskCompletions).where(eq(parentTaskCompletions.completedByParent, id));
      // Skip deleting events - they can remain with the member ID in assignedTo array
      await db.delete(voiceNotes).where(eq(voiceNotes.createdBy, id));
      
      // Now delete the family member
      const result = await db.delete(familyMembers).where(eq(familyMembers.id, id));
      console.log(`Successfully deleted family member ${id} and all related records`);
      return true;
    } catch (error) {
      console.error(`Failed to delete family member ${id}:`, error);
      return false;
    }
  }

  async linkFamilyMemberToUser(familyMemberId: number, userId: number): Promise<FamilyMember | undefined> {
    const [member] = await db
      .update(familyMembers)
      .set({ userId, canLogin: true })
      .where(eq(familyMembers.id, familyMemberId))
      .returning();
    return member;
  }

  async createParentInvite(email: string, familyId: number, role: "mom" | "dad" | "parent"): Promise<string> {
    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Check if user already exists
    const existingUser = await this.getUserByEmail(email);
    
    if (existingUser) {
      // User exists, just add them to family
      await this.createFamilyMembership({
        userId: existingUser.id,
        familyId,
        role: "admin"
      });
      
      // Create or link family member
      const [member] = await db.select().from(familyMembers)
        .where(and(
          eq(familyMembers.email, email),
          eq(familyMembers.familyId, familyId)
        ));
      
      if (!member) {
        await this.createFamilyMember({
          name: `${existingUser.firstName || ''} ${existingUser.lastName || ''}`.trim() || email.split('@')[0],
          role,
          color: role === 'mom' ? '#E53E3E' : '#3182CE',
          avatar: (existingUser.firstName || email)[0].toUpperCase(),
          email,
          userId: existingUser.id,
          familyId,
          canLogin: true,
          isActive: true,
          notificationPreference: 'both'
        });
      } else {
        await this.linkFamilyMemberToUser(member.id, existingUser.id);
      }
    }
    
    return inviteCode;
  }

  // Kid Points Management (for child and teen roles)
  async getKidsWithPoints(familyId: number): Promise<FamilyMember[]> {
    return await db.select().from(familyMembers)
      .where(and(
        eq(familyMembers.familyId, familyId),
        eq(familyMembers.isActive, true),
        or(
          eq(familyMembers.role, 'child'),
          eq(familyMembers.role, 'teen')
        )
      ));
  }

  async addKidPoints(familyMemberId: number, points: number): Promise<FamilyMember | undefined> {
    const member = await this.getFamilyMemberById(familyMemberId);
    if (!member) return undefined;
    
    const currentPoints = member.points || 0;
    const [updated] = await db
      .update(familyMembers)
      .set({ points: currentPoints + points })
      .where(eq(familyMembers.id, familyMemberId))
      .returning();
    return updated;
  }

  async deductKidPoints(familyMemberId: number, points: number): Promise<FamilyMember | undefined> {
    const member = await this.getFamilyMemberById(familyMemberId);
    if (!member) return undefined;
    
    const currentPoints = member.points || 0;
    const newPoints = Math.max(0, currentPoints - points); // Don't go negative
    const [updated] = await db
      .update(familyMembers)
      .set({ points: newPoints })
      .where(eq(familyMembers.id, familyMemberId))
      .returning();
    return updated;
  }

  async resetKidPoints(familyMemberId: number): Promise<FamilyMember | undefined> {
    const [updated] = await db
      .update(familyMembers)
      .set({ points: 0 })
      .where(eq(familyMembers.id, familyMemberId))
      .returning();
    return updated;
  }

  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getTodayEvents(): Promise<Event[]> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    return await db.select().from(events)
      .where(and(
        gte(events.startTime, todayStart),
        lt(events.startTime, todayEnd)
      ));
  }

  // Helper function to expand recurring events into instances
  expandRecurringEvents(baseEvents: Event[], startRange: Date, endRange: Date): Event[] {
    const expandedEvents: Event[] = [];
    
    for (const event of baseEvents) {
      const recurrenceType = (event as any).recurrenceType || 'none';
      const recurrenceInterval = (event as any).recurrenceInterval || 1;
      const recurrenceEndDate = (event as any).recurrenceEndDate;
      
      // Non-recurring events are added as-is
      if (recurrenceType === 'none' || !recurrenceType) {
        expandedEvents.push(event);
        continue;
      }
      
      // Add the original event instance
      expandedEvents.push(event);
      
      // Generate recurring instances within the date range
      const eventStart = new Date(event.startTime);
      const eventDuration = event.endTime ? new Date(event.endTime).getTime() - eventStart.getTime() : 0;
      let currentDate = new Date(eventStart);
      let instanceCount = 0;
      const maxInstances = 365; // Limit to prevent infinite loops
      
      while (instanceCount < maxInstances) {
        // Calculate next occurrence
        switch (recurrenceType) {
          case 'daily':
            currentDate = new Date(currentDate.getTime() + recurrenceInterval * 24 * 60 * 60 * 1000);
            break;
          case 'weekly':
            currentDate = new Date(currentDate.getTime() + recurrenceInterval * 7 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + recurrenceInterval));
            break;
          case 'yearly':
            currentDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + recurrenceInterval));
            break;
          default:
            break;
        }
        
        // Check if we've passed the end date
        if (recurrenceEndDate && currentDate > new Date(recurrenceEndDate)) {
          break;
        }
        
        // Check if we've passed the range end
        if (currentDate > endRange) {
          break;
        }
        
        // Only add instances within the date range
        if (currentDate >= startRange) {
          const virtualEvent: Event = {
            ...event,
            id: -(event.id * 10000 + instanceCount), // Negative ID for virtual instances
            startTime: new Date(currentDate),
            endTime: eventDuration ? new Date(currentDate.getTime() + eventDuration) : null,
          };
          expandedEvents.push(virtualEvent);
        }
        
        instanceCount++;
      }
    }
    
    return expandedEvents;
  }

  async getEventsByFamily(familyId: number, expandRecurrences: boolean = true): Promise<Event[]> {
    // Get all family members for this family
    const familyMemberIds = await db.select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
    
    if (familyMemberIds.length === 0) {
      return [];
    }
    
    const memberIds = familyMemberIds.map(fm => fm.id);
    
    // Get events created by any family member 
    // Also include events where createdBy is null (legacy events)
    const baseEvents = await db.select().from(events)
      .where(
        or(
          inArray(events.createdBy, memberIds),
          isNull(events.createdBy)
        )
      );
    
    // Expand recurring events if requested
    if (expandRecurrences) {
      const now = new Date();
      const startRange = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1 month ago
      const endRange = new Date(now.getFullYear(), now.getMonth() + 12, 0); // 12 months ahead
      return this.expandRecurringEvents(baseEvents, startRange, endRange);
    }
    
    return baseEvents;
  }

  async getTodayEventsByFamily(familyId: number): Promise<Event[]> {
    // Use Mountain Time (MDT/MST) - adjust for timezone
    const now = new Date();
    const timezoneOffset = 6 * 60 * 60 * 1000; // 6 hours in milliseconds for MDT
    
    // Get current local time by subtracting timezone offset from UTC
    const localNow = new Date(now.getTime() - timezoneOffset);
    
    // Create start and end of today in local time, then convert back to UTC for database query
    const todayStart = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    // Convert back to UTC for database comparison
    const todayStartUTC = new Date(todayStart.getTime() + timezoneOffset);
    const todayEndUTC = new Date(todayEnd.getTime() + timezoneOffset);
    
    // Get all family members for this family
    const familyMemberIds = await db.select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
    
    if (familyMemberIds.length === 0) {
      return [];
    }
    
    const memberIds = familyMemberIds.map(fm => fm.id);
    
    // Get all events (including recurring) and filter for today
    const allEvents = await db.select().from(events)
      .where(
        or(
          inArray(events.createdBy, memberIds),
          isNull(events.createdBy)
        )
      );
    
    // Expand recurring events and filter for today
    const expandedEvents = this.expandRecurringEvents(allEvents, todayStartUTC, todayEndUTC);
    
    // Filter to only today's events
    return expandedEvents.filter(event => {
      const eventStart = new Date(event.startTime);
      return eventStart >= todayStartUTC && eventStart < todayEndUTC;
    });
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    
    // Create automatic notifications for the event
    await this.createEventNotifications(event);
    
    return event;
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set(updates)
      .where(eq(events.id, id))
      .returning();
    return event || undefined;
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async deleteEvent(id: number): Promise<boolean> {
    try {
      // First delete any related notifications to avoid foreign key constraint violations
      await db.delete(notifications).where(eq(notifications.relatedEventId, id));
      
      // Then delete the event
      const result = await db
        .delete(events)
        .where(eq(events.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Failed to delete event ${id}:`, error);
      return false;
    }
  }

  async deleteAllEvents(familyId: number): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.familyId, familyId));
    return result.rowCount !== null && result.rowCount >= 0;
  }

  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksForToday(): Promise<Task[]> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    return await db.select().from(tasks)
      .where(and(
        gte(tasks.dueDate, todayStart),
        lt(tasks.dueDate, todayEnd)
      ));
  }

  async getPendingTasks(): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.isCompleted, false));
  }

  async getTasksByFamily(familyId: number, currentMemberId?: number): Promise<Task[]> {
    // Get all family members for this family
    const familyMemberIds = await db.select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
    
    if (familyMemberIds.length === 0) {
      return [];
    }
    
    const memberIds = familyMemberIds.map(fm => fm.id);
    
    // Get tasks created by any family member
    const allTasks = await db.select().from(tasks)
      .where(inArray(tasks.createdBy, memberIds));
    
    // Filter private tasks: only show if created by current user
    if (currentMemberId) {
      return allTasks.filter(task => !task.isPrivate || task.createdBy === currentMemberId);
    }
    
    // If no currentMemberId provided, show all non-private tasks only
    return allTasks.filter(task => !task.isPrivate);
  }

  async getTasksForTodayByFamily(familyId: number): Promise<Task[]> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    // Get all family members for this family first
    const familyMemberIds = await db.select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
    
    if (familyMemberIds.length === 0) {
      return [];
    }
    
    const memberIds = familyMemberIds.map(fm => fm.id);
    
    return await db.select().from(tasks)
      .where(and(
        inArray(tasks.createdBy, memberIds),
        gte(tasks.dueDate, todayStart),
        lt(tasks.dueDate, todayEnd)
      ));
  }

  async getPendingTasksByFamily(familyId: number, currentMemberId?: number): Promise<Task[]> {
    // Get all family members for this family
    const familyMemberIds = await db.select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
    
    if (familyMemberIds.length === 0) {
      return [];
    }
    
    const memberIds = familyMemberIds.map(fm => fm.id);
    
    // Get pending tasks created by any family member
    const allTasks = await db.select().from(tasks)
      .where(and(
        inArray(tasks.createdBy, memberIds),
        eq(tasks.isCompleted, false)
      ));
    
    // Filter private tasks: only show if created by current user
    if (currentMemberId) {
      return allTasks.filter(task => !task.isPrivate || task.createdBy === currentMemberId);
    }
    
    // If no currentMemberId provided, show all non-private tasks only
    return allTasks.filter(task => !task.isPrivate);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    // Convert string dueDate to Date if needed
    const processedTask = {
      ...insertTask,
      dueDate: insertTask.dueDate
        ? typeof insertTask.dueDate === 'string'
          ? new Date(insertTask.dueDate)
          : insertTask.dueDate
        : null
    };
    
    const [task] = await db.insert(tasks).values(processedTask).returning();
    return task;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return task || undefined;
  }

  async completeTask(id: number, completedBy: number): Promise<Task | undefined> {
    const [task] = await db.update(tasks)
      .set({ 
        isCompleted: true, 
        completedBy,
        completedAt: new Date()
      })
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db
      .delete(tasks)
      .where(eq(tasks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteAllTasks(familyId: number): Promise<boolean> {
    // Get all family member IDs for this family
    const members = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
    
    const memberIds = members.map(m => m.id);
    
    // If no members, nothing to delete
    if (memberIds.length === 0) {
      return true;
    }
    
    // Delete all tasks created by any member of this family
    const result = await db
      .delete(tasks)
      .where(inArray(tasks.createdBy, memberIds));
    
    return result.rowCount !== null && result.rowCount >= 0;
  }

  async deleteTasksByScope(currentMemberId: number, familyId: number, scope: 'self' | 'teens' | 'children' | 'all' | 'completed'): Promise<boolean> {
    // Get the current member's role
    const currentMember = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, currentMemberId))
      .limit(1);
    
    if (currentMember.length === 0) {
      return false;
    }
    
    const currentRole = currentMember[0].role;
    const isParent = ['mom', 'dad', 'parent'].includes(currentRole);
    
    // Build list of member IDs whose tasks can be deleted
    let memberIdsToDelete: number[] = [];
    
    if (scope === 'self') {
      // Only delete current member's own tasks
      memberIdsToDelete = [currentMemberId];
    } else {
      // Get all family members
      const allMembers = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.familyId, familyId));
      
      if (scope === 'teens') {
        // Delete only teen tasks
        const teenMembers = allMembers.filter(m => m.role === 'teen');
        memberIdsToDelete = teenMembers.map(m => m.id);
      } else if (scope === 'children') {
        // Delete only child tasks
        const childMembers = allMembers.filter(m => m.role === 'child');
        memberIdsToDelete = childMembers.map(m => m.id);
      } else if (scope === 'all') {
        // Parents can delete: self + teens + children (but NOT other parents)
        if (isParent) {
          memberIdsToDelete = allMembers
            .filter(m => 
              m.id === currentMemberId || // Own tasks
              m.role === 'teen' ||        // Teen tasks
              m.role === 'child'          // Child tasks
            )
            .map(m => m.id);
        } else {
          // Non-parents can only delete their own
          memberIdsToDelete = [currentMemberId];
        }
      } else if (scope === 'completed') {
        // Delete all completed tasks for family members current user can manage
        if (isParent) {
          memberIdsToDelete = allMembers
            .filter(m => 
              m.id === currentMemberId || // Own tasks
              m.role === 'teen' ||        // Teen tasks
              m.role === 'child'          // Child tasks
            )
            .map(m => m.id);
        } else {
          memberIdsToDelete = [currentMemberId];
        }
        
        // Delete only completed tasks
        const result = await db
          .delete(tasks)
          .where(and(
            inArray(tasks.createdBy, memberIdsToDelete),
            eq(tasks.isCompleted, true)
          ));
        
        return result.rowCount !== null && result.rowCount >= 0;
      }
    }
    
    // If no member IDs to delete, return success (nothing to do)
    if (memberIdsToDelete.length === 0) {
      return true;
    }
    
    // Delete tasks created by the specified members
    const result = await db
      .delete(tasks)
      .where(inArray(tasks.createdBy, memberIdsToDelete));
    
    return result.rowCount !== null && result.rowCount >= 0;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByFamilyMember(familyMemberId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assignedTo, familyMemberId));
  }

  async addPointsToFamilyMember(familyMemberId: number, points: number): Promise<FamilyMember | undefined> {
    const member = await this.getFamilyMember(familyMemberId);
    if (!member) return undefined;
    
    const newPoints = (member.points || 0) + points;
    const [updated] = await db
      .update(familyMembers)
      .set({ points: newPoints })
      .where(eq(familyMembers.id, familyMemberId))
      .returning();
    return updated;
  }

  async getVoiceNotes(): Promise<VoiceNote[]> {
    return await db.select().from(voiceNotes);
  }

  async getRecentVoiceNotes(): Promise<VoiceNote[]> {
    return await db.select().from(voiceNotes)
      .orderBy(desc(voiceNotes.createdAt))
      .limit(5);
  }

  async getRecentVoiceNotesByFamily(familyId: number): Promise<VoiceNote[]> {
    return await db.select({
      id: voiceNotes.id,
      content: voiceNotes.content,
      transcription: voiceNotes.transcription,
      createdBy: voiceNotes.createdBy,
      createdAt: voiceNotes.createdAt,
      isProcessed: voiceNotes.isProcessed
    })
    .from(voiceNotes)
    .innerJoin(familyMembers, eq(voiceNotes.createdBy, familyMembers.id))
    .where(eq(familyMembers.familyId, familyId))
    .orderBy(desc(voiceNotes.createdAt))
    .limit(5);
  }

  async createVoiceNote(insertNote: InsertVoiceNote): Promise<VoiceNote> {
    const [note] = await db.insert(voiceNotes).values({
      ...insertNote,
      createdAt: new Date(),
      isProcessed: false
    }).returning();
    return note;
  }

  async getVoiceNotesByCreator(creatorId: number): Promise<VoiceNote[]> {
    return await db.select().from(voiceNotes)
      .where(eq(voiceNotes.createdBy, creatorId))
      .orderBy(desc(voiceNotes.createdAt));
  }

  // Text Notes implementations
  async getTextNotes(): Promise<TextNote[]> {
    return await db.select().from(textNotes).orderBy(desc(textNotes.updatedAt));
  }

  async getTextNotesByUser(userId: number): Promise<TextNote[]> {
    return await db.select().from(textNotes)
      .where(eq(textNotes.userId, userId))
      .orderBy(desc(textNotes.updatedAt));
  }

  async getTextNoteById(id: number, userId: number): Promise<TextNote | undefined> {
    const [note] = await db.select().from(textNotes)
      .where(and(eq(textNotes.id, id), eq(textNotes.userId, userId)));
    return note;
  }

  async createTextNote(insertNote: InsertTextNote): Promise<TextNote> {
    const [note] = await db.insert(textNotes).values({
      ...insertNote,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return note;
  }

  async updateTextNote(id: number, updates: Partial<InsertTextNote>, userId: number): Promise<TextNote | undefined> {
    const [note] = await db.update(textNotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(textNotes.id, id), eq(textNotes.userId, userId)))
      .returning();
    return note;
  }

  async deleteTextNote(id: number): Promise<boolean> {
    const result = await db.delete(textNotes)
      .where(eq(textNotes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getDeadlines(): Promise<Deadline[]> {
    return await db.select().from(deadlines);
  }

  async getUpcomingDeadlines(): Promise<Deadline[]> {
    const now = new Date();
    return await db.select().from(deadlines)
      .where(and(
        eq(deadlines.isCompleted, false),
        gte(deadlines.dueDate, now)
      ))
      .orderBy(deadlines.dueDate);
  }

  async createDeadline(insertDeadline: InsertDeadline): Promise<Deadline> {
    const [deadline] = await db.insert(deadlines).values(insertDeadline).returning();
    return deadline;
  }

  async getNotifications(recipientId?: number): Promise<Notification[]> {
    if (recipientId) {
      return await db.select().from(notifications)
        .where(eq(notifications.recipientId, recipientId))
        .orderBy(desc(notifications.createdAt));
    }
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(and(
        eq(notifications.status, "pending"),
        gte(notifications.scheduledFor, new Date())
      ))
      .orderBy(notifications.scheduledFor);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationSent(id: number): Promise<void> {
    await db.update(notifications)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await db.delete(notifications)
      .where(eq(notifications.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async clearAllNotificationsByFamily(familyId: number): Promise<number> {
    // Get all family member IDs for this family
    const familyMemberIds = await db.select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
    
    if (familyMemberIds.length === 0) {
      return 0;
    }
    
    const memberIds = familyMemberIds.map(fm => fm.id);
    
    // Delete notifications for all family members
    const result = await db.delete(notifications)
      .where(inArray(notifications.recipientId, memberIds));
    
    return result.rowCount || 0;
  }

  // Push Token implementations
  async createPushToken(insertPushToken: InsertPushToken): Promise<PushToken> {
    const [pushToken] = await db.insert(pushTokens).values(insertPushToken).returning();
    return pushToken;
  }

  async getPushTokensByUser(userId: number): Promise<PushToken[]> {
    return await db.select().from(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)))
      .orderBy(desc(pushTokens.lastUsed));
  }

  async updatePushToken(tokenId: number, updates: Partial<InsertPushToken>): Promise<PushToken | undefined> {
    const [updatedToken] = await db.update(pushTokens)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pushTokens.id, tokenId))
      .returning();
    return updatedToken;
  }

  async deletePushToken(tokenId: number): Promise<boolean> {
    const result = await db.delete(pushTokens)
      .where(eq(pushTokens.id, tokenId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getPushTokensByFamily(familyId: number): Promise<PushToken[]> {
    // Get all family member IDs for this family
    const familyMemberIds = await db.select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
    
    if (familyMemberIds.length === 0) {
      return [];
    }
    
    const memberIds = familyMemberIds.map(fm => fm.id);
    
    // Get push tokens for all family members
    return await db.select().from(pushTokens)
      .where(and(
        inArray(pushTokens.familyMemberId, memberIds),
        eq(pushTokens.isActive, true)
      ))
      .orderBy(desc(pushTokens.lastUsed));
  }

  // User Subscription implementations
  async getUserSubscription(userId: number): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .limit(1);
    return subscription;
  }

  async createUserSubscription(insertSubscription: InsertUserSubscription): Promise<UserSubscription> {
    const [subscription] = await db.insert(userSubscriptions).values(insertSubscription).returning();
    return subscription;
  }

  async updateUserSubscription(userId: number, updates: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined> {
    const [updatedSubscription] = await db.update(userSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSubscriptions.userId, userId))
      .returning();
    return updatedSubscription;
  }

  // Referral Shares
  async createReferralShare(share: InsertReferralShare): Promise<ReferralShare> {
    const [newShare] = await db.insert(referralShares).values(share).returning();
    return newShare;
  }

  async getReferralSharesByUser(userId: number): Promise<ReferralShare[]> {
    return await db.select().from(referralShares).where(eq(referralShares.userId, userId));
  }

  async getReferralShareStats(): Promise<{ total: number; shared: number; skipped: number }> {
    const allShares = await db.select().from(referralShares);
    const total = allShares.length;
    const shared = allShares.filter(s => s.platform !== 'skip').length;
    const skipped = allShares.filter(s => s.platform === 'skip').length;
    return { total, shared, skipped };
  }

  // Helper method to automatically create notifications when tasks are assigned
  async createTaskWithNotification(insertTask: InsertTask): Promise<Task> {
    const task = await this.createTask(insertTask);
    
    if (task.assignedTo) {
      const assignedMember = await this.getFamilyMember(task.assignedTo);
      if (assignedMember && assignedMember.notificationPreference !== "none") {
        const notification: InsertNotification = {
          type: "task_assigned",
          title: "New Task Assigned",
          message: `You've been assigned: ${task.title}`,
          recipientId: task.assignedTo,
          relatedTaskId: task.id,
          relatedEventId: null,
          scheduledFor: new Date(), // Send immediately
          deliveryMethod: assignedMember.notificationPreference === "email" ? "email" : "sms",
          status: "pending"
        };
        await this.createNotification(notification);
      }
    }
    
    return task;
  }

  async createEventNotifications(event: Event): Promise<void> {
    if (!event.assignedTo || event.assignedTo.length === 0 || event.isAllDay) return;
    
    const eventTime = new Date(event.startTime);
    const now = new Date();
    
    // Create multiple reminders for important events
    const reminders = [
      { hours: 24, title: "Tomorrow's Event", message: `You have "${event.title}" scheduled for tomorrow at ${eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` },
      { hours: 2, title: "Upcoming Event", message: `"${event.title}" starts in 2 hours${event.location ? ` at ${event.location}` : ''}` },
      { hours: 0.25, title: "Event Starting Soon", message: `"${event.title}" starts in 15 minutes${event.location ? ` at ${event.location}` : ''}` }
    ];
    
    // Create notifications for each assigned family member
    for (const assignedMemberId of event.assignedTo) {
      for (const reminder of reminders) {
        const reminderTime = new Date(eventTime.getTime() - reminder.hours * 60 * 60 * 1000);
        
        // Only create notifications for future times
        if (reminderTime > now) {
          const notification: InsertNotification = {
            type: "event_reminder",
            title: reminder.title,
            message: reminder.message,
            recipientId: assignedMemberId,
            relatedEventId: event.id,
            scheduledFor: reminderTime,
            deliveryMethod: "sms"
          };
          
          await this.createNotification(notification);
        }
      }
    }
  }

  async getPasswords(): Promise<Password[]> {
    return await db.select().from(passwords);
  }

  async getPasswordsByFamily(familyId: number): Promise<Password[]> {
    // Get all family member IDs for this family
    const familyMemberList = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
    
    const memberIds = familyMemberList.map(m => m.id);
    
    if (memberIds.length === 0) {
      return [];
    }
    
    // Get passwords created by any family member
    return await db
      .select()
      .from(passwords)
      .where(inArray(passwords.createdBy, memberIds));
  }

  async createPassword(insertPassword: InsertPassword): Promise<Password> {
    const [password] = await db.insert(passwords).values(insertPassword).returning();
    return password;
  }

  async updatePasswordSharing(id: number, sharedWith: number[]): Promise<Password | undefined> {
    const [password] = await db
      .update(passwords)
      .set({ 
        sharedWith: JSON.stringify(sharedWith),
        lastUpdated: new Date()
      })
      .where(eq(passwords.id, id))
      .returning();
    return password;
  }

  async getPasswordsByCreator(creatorId: number): Promise<Password[]> {
    return await db
      .select()
      .from(passwords)
      .where(eq(passwords.createdBy, creatorId))
      .orderBy(desc(passwords.createdAt));
  }

  async getPasswordById(id: number): Promise<Password | undefined> {
    const [password] = await db
      .select()
      .from(passwords)
      .where(eq(passwords.id, id));
    return password;
  }

  async updatePassword(id: number, updates: Partial<InsertPassword>): Promise<Password | undefined> {
    const [password] = await db
      .update(passwords)
      .set({ 
        ...updates,
        lastUpdated: new Date()
      })
      .where(eq(passwords.id, id))
      .returning();
    return password;
  }

  async deletePassword(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(passwords)
        .where(eq(passwords.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Failed to delete password ${id}:`, error);
      return false;
    }
  }

  async deletePasswordsByCreator(creatorId: number): Promise<number> {
    try {
      const result = await db
        .delete(passwords)
        .where(eq(passwords.createdBy, creatorId));
      return result.rowCount || 0;
    } catch (error) {
      console.error(`Failed to delete passwords for creator ${creatorId}:`, error);
      return 0;
    }
  }

  async deletePasswordsByFamily(familyId: number): Promise<number> {
    try {
      // Get all family member IDs for this family
      const familyMemberList = await db
        .select({ id: familyMembers.id })
        .from(familyMembers)
        .where(eq(familyMembers.familyId, familyId));
      
      const memberIds = familyMemberList.map(m => m.id);
      
      if (memberIds.length === 0) {
        return 0;
      }

      // Delete all passwords created by any family member
      const result = await db
        .delete(passwords)
        .where(inArray(passwords.createdBy, memberIds));
      
      return result.rowCount || 0;
    } catch (error) {
      console.error(`Failed to delete passwords for family ${familyId}:`, error);
      return 0;
    }
  }

  async getGroceryItems(): Promise<GroceryItem[]> {
    return await db.select().from(groceryItems).orderBy(desc(groceryItems.createdAt));
  }

  async getGroceryItemsByFamily(familyId: number): Promise<GroceryItem[]> {
    return await db
      .select()
      .from(groceryItems)
      .leftJoin(familyMembers, eq(groceryItems.addedBy, familyMembers.id))
      .where(eq(familyMembers.familyId, familyId))
      .orderBy(desc(groceryItems.createdAt))
      .then(rows => rows.map(row => row.grocery_items));
  }

  async createGroceryItem(insertItem: InsertGroceryItem): Promise<GroceryItem> {
    const [item] = await db
      .insert(groceryItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateGroceryItem(id: number, updates: Partial<InsertGroceryItem>): Promise<GroceryItem | undefined> {
    const [item] = await db
      .update(groceryItems)
      .set(updates)
      .where(eq(groceryItems.id, id))
      .returning();
    return item;
  }

  async deleteGroceryItem(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(groceryItems)
        .where(eq(groceryItems.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Failed to delete grocery item ${id}:`, error);
      return false;
    }
  }

  async deleteAllGroceryItems(familyId: number): Promise<boolean> {
    try {
      // Get all family member IDs for this family
      const members = await db
        .select({ id: familyMembers.id })
        .from(familyMembers)
        .where(eq(familyMembers.familyId, familyId));
      
      const memberIds = members.map(m => m.id);
      
      // If no members, nothing to delete
      if (memberIds.length === 0) {
        return true;
      }
      
      // Delete all grocery items added by any member of this family
      const result = await db
        .delete(groceryItems)
        .where(inArray(groceryItems.addedBy, memberIds));
      
      return result.rowCount !== null && result.rowCount >= 0;
    } catch (error) {
      console.error('Failed to delete all grocery items:', error);
      return false;
    }
  }

  // Teen Profile Management
  async deleteTeenProfile(teenProfileId: number): Promise<boolean> {
    try {
      // Delete notification settings first
      await db.delete(teenNotificationSettings).where(eq(teenNotificationSettings.teenProfileId, teenProfileId));
      
      // Delete teen profile
      const result = await db.delete(teenProfiles).where(eq(teenProfiles.id, teenProfileId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Failed to delete teen profile:', error);
      return false;
    }
  }

  async deleteUserById(userId: number): Promise<boolean> {
    try {
      // Delete related family member records first
      await db.delete(familyMembers).where(eq(familyMembers.userId, userId));
      
      // Delete user
      const result = await db.delete(users).where(eq(users.id, userId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }





  async getMealPlans(): Promise<MealPlan[]> {
    return await db.select().from(mealPlans).orderBy(desc(mealPlans.createdAt));
  }

  async getMealPlansByFamily(familyId: number): Promise<MealPlan[]> {
    return await db
      .select()
      .from(mealPlans)
      .innerJoin(familyMembers, eq(mealPlans.createdBy, familyMembers.id))
      .where(eq(familyMembers.familyId, familyId))
      .orderBy(desc(mealPlans.createdAt))
      .then(results => results.map(result => result.meal_plans));
  }

  async getWeeklyMealPlans(): Promise<MealPlan[]> {
    return await db.select().from(mealPlans).where(eq(mealPlans.mealType, "dinner"));
  }

  async createMealPlan(insertPlan: InsertMealPlan): Promise<MealPlan> {
    const [plan] = await db
      .insert(mealPlans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  async createMealPlanForFamily(insertPlan: InsertMealPlan, familyId: number): Promise<MealPlan> {
    // Validate that createdBy is in the correct family
    if (insertPlan.createdBy) {
      const familyMember = await db
        .select()
        .from(familyMembers)
        .where(and(
          eq(familyMembers.id, insertPlan.createdBy),
          eq(familyMembers.familyId, familyId)
        ))
        .limit(1);
      
      if (familyMember.length === 0) {
        throw new Error("Cannot create meal plan: creator not in specified family");
      }
    }

    const [plan] = await db
      .insert(mealPlans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  async updateMealPlan(id: number, updates: Partial<InsertMealPlan>): Promise<MealPlan | undefined> {
    const [updated] = await db.update(mealPlans)
      .set(updates)
      .where(eq(mealPlans.id, id))
      .returning();
    return updated;
  }

  async deleteMealPlan(id: number): Promise<boolean> {
    const result = await db.delete(mealPlans).where(eq(mealPlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteAllMealPlans(): Promise<number> {
    const result = await db.delete(mealPlans);
    return result.rowCount ?? 0;
  }

  // Family Merge Request Implementation
  async createFamilyMergeRequestByPhone(partnerPhone: string, requesterId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Normalize phone number - strip non-digits
      const normalizedPhone = partnerPhone.replace(/\D/g, '');
      
      // Find user by phone number (check both users.phoneNumber and familyMembers.phone)
      const [userResult] = await db.select()
        .from(users)
        .where(sql`REPLACE(REPLACE(REPLACE(REPLACE(${users.phoneNumber}, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ${'%' + normalizedPhone.slice(-10)}`);
      
      let partnerUser = userResult;
      
      // If not found in users table, check family_members linked to users
      if (!partnerUser) {
        const [memberResult] = await db.select({
          user: users
        })
        .from(familyMembers)
        .innerJoin(users, eq(familyMembers.userId, users.id))
        .where(sql`REPLACE(REPLACE(REPLACE(REPLACE(${familyMembers.phone}, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ${'%' + normalizedPhone.slice(-10)}`);
        
        if (memberResult) {
          partnerUser = memberResult.user;
        }
      }
      
      if (!partnerUser) {
        return { success: false, message: "No account found with that phone number. Make sure your partner has registered and added their phone number." };
      }

      // Check if partner has a family
      const partnerFamily = await this.getFamilyByUserId(partnerUser.id);
      if (!partnerFamily) {
        return { success: false, message: "Partner doesn't have a family account to merge with." };
      }

      // Get requester's family and info
      const requesterFamily = await this.getFamilyByUserId(requesterId);
      if (!requesterFamily) {
        return { success: false, message: "You must have a family account to request a merge." };
      }
      
      const requester = await this.getUser(requesterId);
      if (!requester) {
        return { success: false, message: "Could not find your account." };
      }

      // Check if they're already in the same family
      if (partnerFamily.id === requesterFamily.id) {
        return { success: false, message: "You're already in the same family." };
      }

      // Store the merge request in notifications table
      const notification: InsertNotification = {
        type: "family_merge_request",
        title: "Family Merge Request",
        message: `${requester.firstName} ${requester.lastName} has requested to merge families with you.`,
        recipientId: partnerUser.id,
        relatedTaskId: null,
        relatedEventId: null,
        scheduledFor: new Date(),
        deliveryMethod: "sms",
        status: "pending"
      };

      await this.createNotification(notification);

      // Send SMS to partner
      const { sendSMS } = await import('./sms-service');
      const appUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'https://themomapp.com';
      
      const smsMessage = `${requester.firstName} wants to merge families with you on The Mom App! Log in to approve or reject: ${appUrl}/login`;
      
      const phoneToSend = partnerUser.phoneNumber || partnerPhone;
      if (phoneToSend) {
        await sendSMS(phoneToSend, smsMessage);
      }

      return { success: true, message: "Merge request sent! Your partner will receive a text message to approve or reject." };
    } catch (error) {
      console.error("Error creating family merge request:", error);
      return { success: false, message: "Failed to send merge request. Please try again." };
    }
  }

  async createFamilyMergeRequest(partnerEmail: string, requesterId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Check if partner exists
      const partnerUser = await this.getUserByEmail(partnerEmail);
      if (!partnerUser) {
        return { success: false, message: "No account found with that email address." };
      }

      // Check if partner has a family
      const partnerFamily = await this.getFamilyByUserId(partnerUser.id);
      if (!partnerFamily) {
        return { success: false, message: "Partner doesn't have a family account to merge with." };
      }

      // Get requester's family and info
      const requesterFamily = await this.getFamilyByUserId(requesterId);
      if (!requesterFamily) {
        return { success: false, message: "You must have a family account to request a merge." };
      }
      
      const requester = await this.getUser(requesterId);
      if (!requester) {
        return { success: false, message: "Could not find your account." };
      }

      // Check if they're already in the same family
      if (partnerFamily.id === requesterFamily.id) {
        return { success: false, message: "You're already in the same family." };
      }

      // Store the merge request in notifications table
      const notification: InsertNotification = {
        type: "family_merge_request",
        title: "Family Merge Request",
        message: `${requester.firstName} ${requester.lastName} has requested to merge families with you.`,
        recipientId: partnerUser.id,
        relatedTaskId: null,
        relatedEventId: null,
        scheduledFor: new Date(),
        deliveryMethod: "email",
        status: "pending"
      };

      await this.createNotification(notification);

      // Send actual email
      const { sendEmail } = await import('./email-service');
      const appUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'https://themomapp.com';
      
      const emailHtml = `
        <h2>Family Merge Request</h2>
        <p><strong>${requester.firstName} ${requester.lastName}</strong> wants to merge families with you on The Mom App!</p>
        <p>When you merge families, all your tasks, events, and family members will be combined into one unified family account.</p>
        <p><a href="${appUrl}/login" style="background-color: #EC4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Log In to Respond</a></p>
        <p>Once logged in, go to Settings to approve or reject this request.</p>
      `;
      
      await sendEmail(partnerEmail, `${requester.firstName} wants to merge families with you!`, emailHtml);

      return { success: true, message: "Merge request sent! Your partner will receive an email to approve or reject." };
    } catch (error) {
      console.error("Error creating family merge request:", error);
      return { success: false, message: "Failed to send merge request. Please try again." };
    }
  }

  async getFamilyMergeRequestsForUser(userEmail: string): Promise<any[]> {
    try {
      const user = await this.getUserByEmail(userEmail);
      if (!user) return [];

      // Get pending merge requests from notifications
      const mergeRequests = await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.type, "family_merge_request"),
          eq(notifications.recipientId, user.id),
          eq(notifications.status, "pending")
        ));

      return mergeRequests;
    } catch (error) {
      console.error("Error fetching merge requests:", error);
      return [];
    }
  }

  async getFamilyMergeRequestById(requestId: number): Promise<any> {
    const [request] = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.id, requestId),
        eq(notifications.type, "family_merge_request")
      ));
    return request;
  }

  async approveFamilyMergeRequest(requestId: number, partnerId: number, billingOptions?: { billingStrategy: string; primaryBiller: number }): Promise<{ success: boolean; message: string }> {
    try {
      // Get the merge request notification
      const [request] = await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.id, requestId),
          eq(notifications.type, "family_merge_request")
        ));

      if (!request) {
        return { success: false, message: "Merge request not found." };
      }

      // Get both families
      const partnerFamily = await this.getFamilyByUserId(partnerId);
      const requesterFamily = await this.getFamilyByUserId(request.recipientId);

      if (!partnerFamily || !requesterFamily) {
        return { success: false, message: "One of the families no longer exists." };
      }

      // Handle billing transition
      if (billingOptions) {
        console.log(`Family merge approved with billing strategy: ${billingOptions.billingStrategy}, primary biller: ${billingOptions.primaryBiller}`);
        
        // Here you would implement billing transition logic:
        // 1. If upgrading to family plan, initiate Stripe subscription upgrade
        // 2. If keeping existing plan, ensure primary biller takes over billing
        // 3. Cancel secondary subscription if needed
        
        // For now, log the billing decision
        console.log(`Billing will be handled by user ID: ${billingOptions.primaryBiller}`);
      }

      // Merge the families - move everything to the partner's family
      await this.moveEventsToFamily(requesterFamily.id, partnerFamily.id);
      await this.moveTasksToFamily(requesterFamily.id, partnerFamily.id);

      // Update family memberships
      await db.update(familyMemberships)
        .set({ familyId: partnerFamily.id })
        .where(eq(familyMemberships.familyId, requesterFamily.id));

      // Update family members
      await db.update(familyMembers)
        .set({ familyId: partnerFamily.id })
        .where(eq(familyMembers.familyId, requesterFamily.id));

      // Mark the request as approved
      await db.update(notifications)
        .set({ status: "approved" })
        .where(eq(notifications.id, requestId));

      return { success: true, message: "Families merged successfully!" };
    } catch (error) {
      console.error("Error approving merge request:", error);
      return { success: false, message: "Failed to merge families. Please try again." };
    }
  }

  async rejectFamilyMergeRequest(requestId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Mark the request as rejected
      await db.update(notifications)
        .set({ status: "rejected" })
        .where(eq(notifications.id, requestId));

      return { success: true, message: "Merge request rejected." };
    } catch (error) {
      console.error("Error rejecting merge request:", error);
      return { success: false, message: "Failed to reject merge request." };
    }
  }

  // Teen Profile methods
  async createTeenProfile(profile: InsertTeenProfile): Promise<TeenProfile> {
    const [teenProfile] = await db.insert(teenProfiles).values(profile).returning();
    return teenProfile;
  }

  async getTeenProfile(teenId: number): Promise<TeenProfile | undefined> {
    const [profile] = await db.select().from(teenProfiles).where(eq(teenProfiles.id, teenId));
    return profile || undefined;
  }

  async getTeenProfileByUserId(userId: number): Promise<TeenProfile | undefined> {
    const [profile] = await db.select().from(teenProfiles).where(eq(teenProfiles.userId, userId));
    return profile || undefined;
  }

  async getTeenProfileByUsername(username: string): Promise<TeenProfile | undefined> {
    const [profile] = await db.select()
      .from(teenProfiles)
      .where(eq(teenProfiles.username, username));
    return profile || undefined;
  }

  async getTeenProfileByFamilyMemberId(familyMemberId: number): Promise<TeenProfile | undefined> {
    const [profile] = await db.select()
      .from(teenProfiles)
      .where(eq(teenProfiles.familyMemberId, familyMemberId));
    return profile || undefined;
  }

  async updateTeenProfile(teenId: number, updates: Partial<InsertTeenProfile>): Promise<TeenProfile | undefined> {
    const [profile] = await db
      .update(teenProfiles)
      .set(updates)
      .where(eq(teenProfiles.id, teenId))
      .returning();
    return profile;
  }

  async updateTeenPoints(teenProfileId: number, points: number): Promise<void> {
    await db.update(teenProfiles)
      .set({ points, updatedAt: new Date() })
      .where(eq(teenProfiles.id, teenProfileId));
  }

  async updateTeenStreak(teenProfileId: number, streak: number): Promise<void> {
    await db.update(teenProfiles)
      .set({ streak, updatedAt: new Date() })
      .where(eq(teenProfiles.id, teenProfileId));
  }

  // Teen notification settings
  async createTeenNotificationSettings(settings: InsertTeenNotificationSettings): Promise<TeenNotificationSettings> {
    const [notificationSettings] = await db.insert(teenNotificationSettings).values(settings).returning();
    return notificationSettings;
  }

  async getTeenNotificationSettings(teenProfileId: number): Promise<TeenNotificationSettings | undefined> {
    const [settings] = await db.select().from(teenNotificationSettings).where(eq(teenNotificationSettings.teenProfileId, teenProfileId));
    return settings || undefined;
  }

  async updateTeenNotificationSettings(teenProfileId: number, settings: Partial<TeenNotificationSettings>): Promise<void> {
    await db.update(teenNotificationSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(teenNotificationSettings.teenProfileId, teenProfileId));
  }

  // Teen task methods
  async getTasksForTeen(teenProfileId: number): Promise<Task[]> {
    // Get the teen profile to find their family member ID
    const teenProfile = await this.getTeenProfile(teenProfileId);
    if (!teenProfile) {
      return [];
    }

    // Get tasks that are either:
    // 1. Directly assigned to the teen via teenId (for self-created tasks)
    // 2. Assigned to the teen's family member ID via assignedTo (for parent-assigned tasks)
    const teenTasks = await db.select().from(tasks).where(
      or(
        eq(tasks.teenId, teenProfileId),
        eq(tasks.assignedTo, teenProfile.familyMemberId)
      )
    );
    
    return teenTasks;
  }

  async assignTaskToTeen(taskId: number, teenProfileId: number): Promise<Task> {
    const [updatedTask] = await db.update(tasks)
      .set({ teenId: teenProfileId, assignedTo: teenProfileId })
      .where(eq(tasks.id, taskId))
      .returning();
    return updatedTask;
  }

  async createFamilyInvite(invite: InsertFamilyInvite): Promise<FamilyInvite> {
    const [newInvite] = await db.insert(familyInvites).values(invite).returning();
    return newInvite;
  }

  async getFamilyInvite(inviteCode: string): Promise<FamilyInvite | undefined> {
    // Use direct SQL since DB column is 'code' not 'invite_code'
    const result = await db.execute(sql`
      SELECT id, code as "inviteCode", family_id as "familyId", teen_name as "teenName", 
             invited_by as "invitedBy", expires_at as "expiresAt", status, 
             accepted_by as "acceptedBy", accepted_at as "acceptedAt"
      FROM family_invites WHERE code = ${inviteCode}
    `);
    return result.rows[0] as FamilyInvite | undefined;
  }

  async updateFamilyInvite(inviteCode: string, updates: Partial<FamilyInvite>): Promise<FamilyInvite | undefined> {
    // Use direct SQL since DB column is 'code' not 'invite_code'
    const result = await db.execute(sql`
      UPDATE family_invites SET status = ${updates.status || 'pending'}
      WHERE code = ${inviteCode}
      RETURNING id, code as "inviteCode", family_id as "familyId", teen_name as "teenName", 
                invited_by as "invitedBy", expires_at as "expiresAt", status
    `);
    return result.rows[0] as FamilyInvite | undefined;
  }

  async getTeenTasks(teenProfileId: number): Promise<Task[]> {
    const teenTasks = await db.select().from(tasks).where(eq(tasks.teenId, teenProfileId));
    return teenTasks;
  }

  async getTeenStats(teenProfileId: number): Promise<{ weeklyPoints: number; streak: number; completedToday: number }> {
    const profile = await this.getTeenProfile(teenProfileId);
    if (!profile) return { weeklyPoints: 0, streak: 0, completedToday: 0 };
    
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const weeklyTasks = await db.select()
      .from(teenTaskHistory)
      .where(
        and(
          eq(teenTaskHistory.teenProfileId, teenProfileId),
          gte(teenTaskHistory.completedAt, weekStart)
        )
      );
    
    const todayTasks = await db.select()
      .from(teenTaskHistory)
      .where(
        and(
          eq(teenTaskHistory.teenProfileId, teenProfileId),
          gte(teenTaskHistory.completedAt, todayStart)
        )
      );
    
    const weeklyPoints = weeklyTasks.reduce((sum, task) => sum + (task.pointsEarned || 0), 0);
    
    return {
      weeklyPoints,
      streak: profile.streak || 0,
      completedToday: todayTasks.length
    };
  }

  async completeTeenTask(taskId: number, teenProfileId: number): Promise<{ task: Task; pointsEarned: number }> {
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task[0]) throw new Error("Task not found");
    
    const pointsEarned = task[0].points || 5; // Default 5 points
    
    // Update task as completed - completedBy expects familyMemberId, not teenProfileId
    const teenProfile = await this.getTeenProfile(teenProfileId);
    await db.update(tasks)
      .set({ isCompleted: true, completedBy: teenProfile?.familyMemberId || null, completedAt: new Date() })
      .where(eq(tasks.id, taskId));
    
    // Update teen points
    if (teenProfile) {
      await this.updateTeenPoints(teenProfile.id, (teenProfile.points || 0) + pointsEarned);
    }
    
    // Log task completion
    await this.createTeenTaskHistory({
      teenProfileId,
      taskId,
      pointsEarned,
      streakDay: teenProfile?.streak || 0
    });
    
    return { task: task[0], pointsEarned };
  }

  async createTeenTaskHistory(history: InsertTeenTaskHistory): Promise<TeenTaskHistory> {
    const [taskHistory] = await db.insert(teenTaskHistory).values(history).returning();
    return taskHistory;
  }

  async logTeenNotification(log: InsertTeenNotificationLog): Promise<TeenNotificationLog> {
    const [notificationLog] = await db.insert(teenNotificationLog).values(log).returning();
    return notificationLog;
  }

  // Child Profile System Methods
  async createChildProfile(profile: InsertChildProfile, parentFamilyMemberId: number): Promise<ChildProfile> {
    // Validate that the parent belongs to the same family as the child
    const parentMember = await db.select().from(familyMembers).where(eq(familyMembers.id, parentFamilyMemberId));
    const childMember = await db.select().from(familyMembers).where(eq(familyMembers.id, profile.familyMemberId));
    
    if (!parentMember[0] || !childMember[0] || parentMember[0].familyId !== childMember[0].familyId) {
      throw new Error("Parent and child must belong to the same family");
    }

    // Set the familyId to match the family member's family
    const profileWithFamily = {
      ...profile,
      familyId: childMember[0].familyId!,
      createdBy: parentFamilyMemberId
    };

    const [childProfile] = await db.insert(childProfiles).values(profileWithFamily).returning();
    return childProfile;
  }

  async getChildProfile(childProfileId: number, parentFamilyMemberId: number): Promise<ChildProfile | undefined> {
    // Validate parent family membership
    const parentMember = await db.select().from(familyMembers).where(eq(familyMembers.id, parentFamilyMemberId));
    if (!parentMember[0]) {
      throw new Error("Parent family member not found");
    }

    const [profile] = await db.select().from(childProfiles)
      .where(and(
        eq(childProfiles.id, childProfileId),
        eq(childProfiles.familyId, parentMember[0].familyId!)
      ));
    return profile || undefined;
  }

  async getChildProfilesByFamily(familyId: number, parentFamilyMemberId: number): Promise<ChildProfile[]> {
    // Validate parent belongs to the requested family
    const parentMember = await db.select().from(familyMembers).where(eq(familyMembers.id, parentFamilyMemberId));
    if (!parentMember[0] || parentMember[0].familyId !== familyId) {
      throw new Error("Parent must belong to the requested family");
    }

    return await db.select().from(childProfiles)
      .where(and(eq(childProfiles.familyId, familyId), eq(childProfiles.isActive, true)));
  }

  async getChildProfileByFamilyMember(familyMemberId: number, parentFamilyMemberId: number): Promise<ChildProfile | undefined> {
    // Validate parent family membership
    const parentMember = await db.select().from(familyMembers).where(eq(familyMembers.id, parentFamilyMemberId));
    if (!parentMember[0]) {
      throw new Error("Parent family member not found");
    }

    const [profile] = await db.select().from(childProfiles)
      .where(and(
        eq(childProfiles.familyMemberId, familyMemberId),
        eq(childProfiles.familyId, parentMember[0].familyId!)
      ));
    return profile || undefined;
  }

  async updateChildProfile(childProfileId: number, updates: Partial<InsertChildProfile>, parentFamilyMemberId: number): Promise<ChildProfile | undefined> {
    // Validate that the parent belongs to the same family as the child
    const childProfile = await this.getChildProfile(childProfileId, parentFamilyMemberId);
    if (!childProfile) {
      throw new Error("Child profile not found or access denied");
    }

    const [updatedProfile] = await db.update(childProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(childProfiles.id, childProfileId))
      .returning();
    return updatedProfile;
  }

  async deleteChildProfile(childProfileId: number, parentFamilyMemberId: number): Promise<boolean> {
    // Validate that the parent belongs to the same family as the child
    const childProfile = await this.getChildProfile(childProfileId, parentFamilyMemberId);
    if (!childProfile) {
      return false;
    }

    // Soft delete by setting isActive to false
    const [deletedProfile] = await db.update(childProfiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(childProfiles.id, childProfileId))
      .returning();
    return !!deletedProfile;
  }

  // Parent Task Completion Methods
  async createParentTaskCompletion(taskId: number, childProfileId: number, parentFamilyMemberId: number, notes?: string): Promise<ParentTaskCompletion> {
    // Validate that the parent has access to this child profile (includes family validation)
    const childProfile = await this.getChildProfile(childProfileId, parentFamilyMemberId);
    if (!childProfile) {
      throw new Error("Child profile not found or access denied");
    }

    // Get parent member details for family validation
    const parentMember = await db.select().from(familyMembers).where(eq(familyMembers.id, parentFamilyMemberId));
    if (!parentMember[0]) {
      throw new Error("Parent family member not found");
    }

    // Create the completion record with server-side validation
    const completionData = {
      taskId,
      childProfileId,
      completedByParent: parentFamilyMemberId,
      familyId: parentMember[0].familyId!,
      completionMethod: "manual" as const,
      notes: notes || null
    };

    const [parentCompletion] = await db.insert(parentTaskCompletions).values(completionData).returning();
    return parentCompletion;
  }

  async getParentTaskCompletions(childProfileId: number, parentFamilyMemberId: number): Promise<ParentTaskCompletion[]> {
    // Validate that the parent has access to this child profile
    const childProfile = await this.getChildProfile(childProfileId, parentFamilyMemberId);
    if (!childProfile) {
      throw new Error("Child profile not found or access denied");
    }

    return await db.select().from(parentTaskCompletions)
      .where(eq(parentTaskCompletions.childProfileId, childProfileId))
      .orderBy(desc(parentTaskCompletions.completedAt));
  }

  async getTasksForChild(childProfileId: number, parentFamilyMemberId: number): Promise<Task[]> {
    // Validate that the parent has access to this child profile
    const childProfile = await this.getChildProfile(childProfileId, parentFamilyMemberId);
    if (!childProfile) {
      return [];
    }

    // Get tasks assigned to this child profile
    return await db.select().from(tasks)
      .where(eq(tasks.childProfileId, childProfileId))
      .orderBy(desc(tasks.createdAt));
  }

  async completeTaskForChild(taskId: number, childProfileId: number, parentFamilyMemberId: number, notes?: string): Promise<Task> {
    // Validate that the parent has access to this child profile
    const childProfile = await this.getChildProfile(childProfileId, parentFamilyMemberId);
    if (!childProfile) {
      throw new Error("Child profile not found or access denied");
    }

    // Complete the task
    const [task] = await db.update(tasks)
      .set({ 
        isCompleted: true, 
        completedBy: parentFamilyMemberId, 
        completedAt: new Date() 
      })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!task) {
      throw new Error("Task not found");
    }

    // Log the parent completion using the new secure method
    await this.createParentTaskCompletion(taskId, childProfileId, parentFamilyMemberId, notes);

    return task;
  }

  // Teen invite methods
  async createTeenInvite(inviteData: InsertFamilyInvite): Promise<FamilyInvite> {
    const [invite] = await db.insert(familyInvites).values(inviteData).returning();
    return invite;
  }

  async acceptFamilyInvite(inviteCode: string, acceptedBy: number): Promise<FamilyInvite | undefined> {
    // Use direct SQL since DB column is 'code' not 'invite_code'
    const result = await db.execute(sql`
      UPDATE family_invites 
      SET status = 'accepted', accepted_at = NOW(), accepted_by = ${acceptedBy}
      WHERE code = ${inviteCode}
      RETURNING id, code as "inviteCode", family_id as "familyId", teen_name as "teenName", 
                invited_by as "invitedBy", expires_at as "expiresAt", status,
                accepted_by as "acceptedBy", accepted_at as "acceptedAt"
    `);
    return result.rows[0] as FamilyInvite | undefined;
  }

  async getFamilyInvites(familyId: number): Promise<FamilyInvite[]> {
    return await db.select()
      .from(familyInvites)
      .where(eq(familyInvites.familyId, familyId));
  }

  async createTeenAccount(accountData: InsertTeenProfile): Promise<TeenProfile> {
    const [account] = await db.insert(teenProfiles).values(accountData).returning();
    return account;
  }

  // Google Calendar sync placeholder - would implement with real Google Calendar API
  async syncGoogleCalendar(calendarId: string, direction: string): Promise<{
    eventCount: number;
    imported: number;
    exported: number;
    calendarId: string;
    direction: string;
    error?: string;
  }> {
    // This would be implemented with real Google Calendar API integration
    // For now, return an informative result
    throw new Error("Google Calendar API integration requires valid OAuth credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
  }

  // Family membership helper
  async getUserFamilyMembership(userId: number): Promise<FamilyMembership | undefined> {
    const [membership] = await db.select().from(familyMemberships).where(eq(familyMemberships.userId, userId));
    return membership || undefined;
  }

  // Household Settings
  async getHouseholdSettings(familyId: number): Promise<HouseholdSettings | undefined> {
    const [settings] = await db.select().from(householdSettings).where(eq(householdSettings.familyId, familyId));
    if (!settings) {
      // Create default settings if they don't exist
      const [newSettings] = await db.insert(householdSettings).values({
        familyId,
        dishwasherIsClean: false
      }).returning();
      return newSettings;
    }
    return settings;
  }

  async updateDishwasherStatus(familyId: number, isClean: boolean, updatedBy: number): Promise<HouseholdSettings> {
    const existing = await this.getHouseholdSettings(familyId);
    
    if (existing) {
      const [updated] = await db.update(householdSettings)
        .set({
          dishwasherIsClean: isClean,
          dishwasherLastUpdated: new Date(),
          dishwasherLastUpdatedBy: updatedBy,
          updatedAt: new Date()
        })
        .where(eq(householdSettings.familyId, familyId))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db.insert(householdSettings).values({
        familyId,
        dishwasherIsClean: isClean,
        dishwasherLastUpdatedBy: updatedBy
      }).returning();
      return newSettings;
    }
  }

  // Feedback Prompts
  async shouldShowFeedbackPrompt(userId: number): Promise<boolean> {
    // Check if user has already responded to this prompt type
    const existingPrompt = await db.select()
      .from(feedbackPrompts)
      .where(and(
        eq(feedbackPrompts.userId, userId),
        eq(feedbackPrompts.promptType, "7_day_check")
      ));
    
    // If they have a prompt and responded or chose remind later with future date, don't show
    if (existingPrompt.length > 0) {
      const prompt = existingPrompt[0];
      if (prompt.response && !prompt.remindLater) {
        return false;
      }
      // If remind later and remind_at is in future, don't show
      if (prompt.remindLater && prompt.remindAt && new Date(prompt.remindAt) > new Date()) {
        return false;
      }
    }
    
    // Check if user is at least 7 days old
    const user = await this.getUserById(userId);
    if (!user || !user.createdAt) {
      return false;
    }
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return new Date(user.createdAt) <= sevenDaysAgo;
  }

  async createFeedbackPrompt(userId: number, promptType: string): Promise<FeedbackPrompt> {
    const [prompt] = await db.insert(feedbackPrompts).values({
      userId,
      promptType,
      shownAt: new Date()
    }).returning();
    return prompt;
  }

  async updateFeedbackPromptResponse(
    userId: number, 
    response: string, 
    feedbackText?: string, 
    reviewRequested?: boolean, 
    remindLater?: boolean
  ): Promise<FeedbackPrompt | undefined> {
    // Find the pending prompt for this user
    const [existing] = await db.select()
      .from(feedbackPrompts)
      .where(and(
        eq(feedbackPrompts.userId, userId),
        eq(feedbackPrompts.promptType, "7_day_check")
      ))
      .orderBy(desc(feedbackPrompts.id))
      .limit(1);
    
    if (!existing) {
      // Create one if it doesn't exist
      const [newPrompt] = await db.insert(feedbackPrompts).values({
        userId,
        promptType: "7_day_check",
        response,
        feedbackText,
        reviewRequested: reviewRequested || false,
        remindLater: remindLater || false,
        remindAt: remindLater ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
        respondedAt: new Date()
      }).returning();
      return newPrompt;
    }
    
    const [updated] = await db.update(feedbackPrompts)
      .set({
        response,
        feedbackText,
        reviewRequested: reviewRequested || false,
        remindLater: remindLater || false,
        remindAt: remindLater ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
        respondedAt: new Date()
      })
      .where(eq(feedbackPrompts.id, existing.id))
      .returning();
    
    return updated;
  }

  async getPendingFeedbackPrompt(userId: number): Promise<FeedbackPrompt | undefined> {
    const [prompt] = await db.select()
      .from(feedbackPrompts)
      .where(and(
        eq(feedbackPrompts.userId, userId),
        eq(feedbackPrompts.promptType, "7_day_check"),
        isNull(feedbackPrompts.response)
      ))
      .orderBy(desc(feedbackPrompts.id))
      .limit(1);
    
    return prompt || undefined;
  }

  async createFeatureRequest(request: InsertFeatureRequest): Promise<FeatureRequest> {
    const [featureRequest] = await db.insert(featureRequests).values(request).returning();
    return featureRequest;
  }
}

/* Temporarily disabled MemStorage to fix TypeScript errors
export class MemStorage {
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

    // Add events for other days this month
    const tomorrowDate = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    this.events.set(4, {
      id: 4,
      title: "Doctor Appointment",
      description: "Sam's annual checkup",
      startTime: new Date(tomorrowDate.getTime() + 10 * 60 * 60 * 1000), // 10 AM tomorrow
      endTime: new Date(tomorrowDate.getTime() + 11 * 60 * 60 * 1000), // 11 AM tomorrow
      location: "Pediatric Clinic",
      assignedTo: 4,
      isAllDay: false
    });

    const nextWeek = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.events.set(5, {
      id: 5,
      title: "School Board Meeting",
      description: "Monthly meeting - Room 101",
      startTime: new Date(nextWeek.getTime() + 18 * 60 * 60 * 1000), // 6 PM next week
      endTime: new Date(nextWeek.getTime() + 20 * 60 * 60 * 1000), // 8 PM next week
      location: "School Board Room 101",
      assignedTo: 1,
      isAllDay: false
    });

    const dayAfterTomorrow = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    this.events.set(6, {
      id: 6,
      title: "Emma's Birthday Party",
      description: "Chuck E. Cheese celebration",
      startTime: new Date(dayAfterTomorrow.getTime() + 14 * 60 * 60 * 1000), // 2 PM
      endTime: new Date(dayAfterTomorrow.getTime() + 17 * 60 * 60 * 1000), // 5 PM
      location: "Chuck E. Cheese",
      assignedTo: 3,
      isAllDay: false
    });

    this.currentEventId = 7;

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
    const friday = new Date(todayStart.getTime() + (5 - todayStart.getDay()) * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.deadlines.set(1, {
      id: 1,
      title: "Emma's science project",
      description: "Solar system model",
      dueDate: tomorrowDate,
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

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async deleteAllTasks(): Promise<boolean> {
    this.tasks.clear();
    return true;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksForTeen(teenId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => 
      task.teenId === teenId || task.assignedTo === teenId
    );
  }

  async assignTaskToTeen(taskId: number, teenId: number): Promise<Task | undefined> {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    
    const updatedTask = { ...task, teenId, assignedTo: teenId };
    this.tasks.set(taskId, updatedTask);
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
*/

export const storage = new DatabaseStorage();

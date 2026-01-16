import { db } from "./db";
import {
  users, subscriptions, usageLogs, groups, groupMembers,
  type User, type InsertUser,
  type Subscription, type InsertSubscription, type UpdateSubscriptionRequest,
  type UsageLog,
  type Group, type GroupMember, type InsertGroupMemberSchema
} from "@shared/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Subscriptions
  getSubscriptions(userId: number): Promise<Subscription[]>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, updates: UpdateSubscriptionRequest): Promise<Subscription>;
  deleteSubscription(id: number): Promise<void>;
  
  // Usage
  logUsage(subscriptionId: number): Promise<UsageLog>;
  getUsageLogs(subscriptionId: number): Promise<UsageLog[]>;
  getUsageCountSince(subscriptionId: number, date: Date): Promise<number>;

  // Groups
  getGroups(ownerId: number): Promise<Group[]>;
  createGroup(group: any): Promise<Group>;
  addGroupMember(member: any): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<GroupMember[]>;

  // Session
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // Auth
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Subscriptions
  async getSubscriptions(userId: number): Promise<Subscription[]> {
    return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return sub;
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [newSub] = await db.insert(subscriptions).values(sub).returning();
    return newSub;
  }

  async updateSubscription(id: number, updates: UpdateSubscriptionRequest): Promise<Subscription> {
    const [updated] = await db.update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, id))
      .returning();
    return updated;
  }

  async deleteSubscription(id: number): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.id, id));
  }

  // Usage
  async logUsage(subscriptionId: number): Promise<UsageLog> {
    // Also update the lastUsageDate on the subscription
    await db.update(subscriptions)
      .set({ lastUsageDate: new Date() })
      .where(eq(subscriptions.id, subscriptionId));

    const [log] = await db.insert(usageLogs)
      .values({ subscriptionId })
      .returning();
    return log;
  }

  async getUsageLogs(subscriptionId: number): Promise<UsageLog[]> {
    return await db.select()
      .from(usageLogs)
      .where(eq(usageLogs.subscriptionId, subscriptionId))
      .orderBy(desc(usageLogs.date));
  }

  async getUsageCountSince(subscriptionId: number, date: Date): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(usageLogs)
      .where(and(
        eq(usageLogs.subscriptionId, subscriptionId),
        gte(usageLogs.date, date)
      ));
    return Number(result[0]?.count || 0);
  }

  // Groups
  async getGroups(ownerId: number): Promise<Group[]> {
    return await db.select().from(groups).where(eq(groups.ownerId, ownerId));
  }

  async createGroup(group: any): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async addGroupMember(member: any): Promise<GroupMember> {
    const [newMember] = await db.insert(groupMembers).values(member).returning();
    return newMember;
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  }
}

export const storage = new DatabaseStorage();

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { subscriptions } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === AUTH SETUP ===
  app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) { // In production use hashing!
        return done(null, false, { message: 'Invalid credentials' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // === ROUTES ===

  // Auth Routes
  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser(input);
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json({ id: user.id, username: user.username });
      });
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      next(err);
    }
  });

  app.post(api.auth.login.path, passport.authenticate('local'), (req, res) => {
    // @ts-ignore
    res.json({ id: req.user!.id, username: req.user!.username });
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.json(null);
    // @ts-ignore
    res.json({ id: req.user!.id, username: req.user!.username });
  });

  // Middleware to check login
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    next();
  };

  // Subscription Routes
  app.get(api.subscriptions.list.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const userId = req.user!.id;
    const subs = await storage.getSubscriptions(userId);
    
    // Calculate stats for each sub
    const subsWithStats = await Promise.all(subs.map(async (sub) => {
      const now = new Date();
      // Calculate usage in current billing period
      const startOfPeriod = new Date();
      startOfPeriod.setMonth(startOfPeriod.getMonth() - 1); // Simplified for monthly
      
      const usageCount = await storage.getUsageCountSince(sub.id, startOfPeriod);
      const costPerUse = usageCount > 0 ? (Number(sub.cost) / usageCount).toFixed(2) : sub.cost;
      
      let valueScore = 'Average';
      if (usageCount > 10) valueScore = 'Good';
      if (usageCount === 0) valueScore = 'Waste';
      
      // Calculate renewal (simplified)
      const daysUntilRenewal = 30 - new Date(sub.startDate).getDate(); 

      return {
        ...sub,
        usageCount,
        costPerUse,
        valueScore,
        daysUntilRenewal
      };
    }));

    res.json(subsWithStats);
  });

  app.post(api.subscriptions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.subscriptions.create.input.parse(req.body);
      // @ts-ignore
      const sub = await storage.createSubscription({ ...input, userId: req.user!.id });
      res.status(201).json(sub);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.subscriptions.get.path, requireAuth, async (req, res) => {
    const sub = await storage.getSubscription(Number(req.params.id));
    if (!sub) return res.status(404).json({ message: "Not found" });
    res.json(sub);
  });

  app.put(api.subscriptions.update.path, requireAuth, async (req, res) => {
    const input = api.subscriptions.update.input.parse(req.body);
    const updated = await storage.updateSubscription(Number(req.params.id), input);
    res.json(updated);
  });

  app.delete(api.subscriptions.delete.path, requireAuth, async (req, res) => {
    await storage.deleteSubscription(Number(req.params.id));
    res.sendStatus(204);
  });

  app.post(api.subscriptions.logUsage.path, requireAuth, async (req, res) => {
    const log = await storage.logUsage(Number(req.params.id));
    res.status(201).json(log);
  });

  // Groups
  app.get(api.groups.list.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const groups = await storage.getGroups(req.user!.id);
    res.json(groups);
  });

  app.post(api.groups.create.path, requireAuth, async (req, res) => {
    const input = api.groups.create.input.parse(req.body);
    // @ts-ignore
    const group = await storage.createGroup({ ...input, ownerId: req.user!.id });
    res.status(201).json(group);
  });

  app.post(api.groups.addMember.path, requireAuth, async (req, res) => {
    const input = api.groups.addMember.input.parse(req.body);
    const member = await storage.addGroupMember({ ...input, groupId: Number(req.params.id) });
    res.status(201).json(member);
  });

  app.get(api.groups.getMembers.path, requireAuth, async (req, res) => {
    const members = await storage.getGroupMembers(Number(req.params.id));
    res.json(members);
  });

  // Stats
  app.get(api.stats.dashboard.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const userId = req.user!.id;
    const subs = await storage.getSubscriptions(userId);
    
    let totalMonthlySpend = 0;
    let activeCount = 0;
    let cancelledCount = 0;
    let wasteCount = 0;

    for (const sub of subs) {
      if (sub.isActive) {
        totalMonthlySpend += Number(sub.cost);
        activeCount++;
        // Check for waste
        const usage = await storage.getUsageCountSince(sub.id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        if (usage === 0) wasteCount++;
      } else {
        cancelledCount++;
      }
    }

    res.json({
      totalMonthlySpend,
      activeCount,
      cancelledCount,
      wasteCount
    });
  });

  // SEED DATA
  // Check if we need to seed
  const testUser = await storage.getUserByUsername('demo');
  if (!testUser) {
    console.log('Seeding database...');
    const user = await storage.createUser({ username: 'demo', password: 'password123' });
    
    // Create some subscriptions
    const sub1 = await storage.createSubscription({
      userId: user.id,
      name: 'Netflix',
      cost: '15.99',
      billingCycle: 'monthly',
      startDate: new Date('2024-01-01'),
      isActive: true,
      autoCancel: false
    });
    
    const sub2 = await storage.createSubscription({
      userId: user.id,
      name: 'Gym Membership',
      cost: '50.00',
      billingCycle: 'monthly',
      startDate: new Date('2024-02-15'),
      isActive: true,
      autoCancel: true
    });

    const sub3 = await storage.createSubscription({
      userId: user.id,
      name: 'Adobe Cloud',
      cost: '54.99',
      billingCycle: 'monthly',
      startDate: new Date('2023-11-01'),
      isActive: true,
      autoCancel: false
    });

     const sub4 = await storage.createSubscription({
      userId: user.id,
      name: 'Old Magazine',
      cost: '9.99',
      billingCycle: 'monthly',
      startDate: new Date('2023-05-01'),
      isActive: false, // Cancelled
      autoCancel: false
    });

    // Log usage for Netflix (Good value)
    for(let i=0; i<15; i++) {
        await storage.logUsage(sub1.id);
    }
    
    // Log usage for Gym (Average)
    for(let i=0; i<5; i++) {
        await storage.logUsage(sub2.id);
    }
    // Adobe (Waste - 0 usage)

    // Create a group
    const group = await storage.createGroup({
      name: 'Roommates',
      ownerId: user.id
    });

    await storage.addGroupMember({
      groupId: group.id,
      userId: user.id,
      memberName: 'Me',
      splitPercentage: '50.00'
    });

    await storage.addGroupMember({
      groupId: group.id,
      userId: 0, // Virtual
      memberName: 'John',
      splitPercentage: '50.00'
    });

    console.log('Seeding complete.');
  }

  return httpServer;
}

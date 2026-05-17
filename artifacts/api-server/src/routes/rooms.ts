import { Router, type IRouter } from "express";
import { db, roomsTable, chatMessagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  ListRoomsResponse,
  GetRoomResponse,
  GetRoomMessagesResponse,
  GetRoomOnlineUsersResponse,
  GetStatsResponse,
  CreateRoomBody,
} from "@workspace/api-zod";
import { getOnlineUsersForRoom, getTotalOnlineUsers } from "../lib/websocket";

const router: IRouter = Router();

// GET /rooms
router.get("/rooms", async (req, res): Promise<void> => {
  const rooms = await db.select().from(roomsTable).orderBy(desc(roomsTable.createdAt));
  const result = rooms.map((r) => ({
    ...r,
    memberCount: getOnlineUsersForRoom(r.id).length,
    messageCount: 0,
    lastActivityAt: r.lastActivityAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
  res.json(ListRoomsResponse.parse(result));
});

// POST /rooms
router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, inactivityDeleteMinutes, emptyDeleteMinutes, messageRetentionHours } = parsed.data;
  const id = randomUUID();
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const [room] = await db
    .insert(roomsTable)
    .values({
      id,
      name,
      isPrivate: true,
      isGlobal: false,
      inviteCode,
      inactivityDeleteMinutes: inactivityDeleteMinutes ?? null,
      emptyDeleteMinutes: emptyDeleteMinutes ?? 15,
      messageRetentionHours: messageRetentionHours ?? null,
    })
    .returning();

  res.status(201).json(
    GetRoomResponse.parse({
      ...room,
      memberCount: 0,
      messageCount: 0,
      lastActivityAt: room.lastActivityAt?.toISOString() ?? null,
      expiresAt: room.expiresAt?.toISOString() ?? null,
      createdAt: room.createdAt.toISOString(),
    })
  );
});

// GET /rooms/:id
router.get("/rooms/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, raw));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(
    GetRoomResponse.parse({
      ...room,
      memberCount: getOnlineUsersForRoom(room.id).length,
      messageCount: 0,
      lastActivityAt: room.lastActivityAt?.toISOString() ?? null,
      expiresAt: room.expiresAt?.toISOString() ?? null,
      createdAt: room.createdAt.toISOString(),
    })
  );
});

// DELETE /rooms/:id
router.delete("/rooms/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, raw));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.roomId, raw));
  await db.delete(roomsTable).where(eq(roomsTable.id, raw));
  res.sendStatus(204);
});

// GET /rooms/:id/messages
router.get("/rooms/:id/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.roomId, raw))
    .orderBy(chatMessagesTable.createdAt)
    .limit(100);

  res.json(
    GetRoomMessagesResponse.parse(
      messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))
    )
  );
});

// DELETE /rooms/:id/messages
router.delete("/rooms/:id/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.roomId, raw));
  res.sendStatus(204);
});

// GET /rooms/:id/online-users
router.get("/rooms/:id/online-users", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const users = getOnlineUsersForRoom(raw);
  res.json(GetRoomOnlineUsersResponse.parse(users));
});

// GET /stats
router.get("/stats", async (_req, res): Promise<void> => {
  const rooms = await db.select().from(roomsTable);
  res.json(
    GetStatsResponse.parse({
      totalOnlineUsers: getTotalOnlineUsers(),
      totalRooms: rooms.length,
      totalMessages: 0,
    })
  );
});

export default router;

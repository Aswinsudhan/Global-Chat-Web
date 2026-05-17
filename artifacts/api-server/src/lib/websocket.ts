import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { db, roomsTable, chatMessagesTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";
import { randomUUID } from "crypto";

interface ChatClient {
  ws: WebSocket;
  userId: string;
  username: string;
  roomId: string;
  joinedAt: Date;
}

interface RoomState {
  aiMode: boolean;
  aiContext: Array<{ role: string; content: string }>;
  inactivityTimer: ReturnType<typeof setTimeout> | null;
  emptyTimer: ReturnType<typeof setTimeout> | null;
  messageCleanupTimer: ReturnType<typeof setInterval> | null;
}

const clients = new Map<WebSocket, ChatClient>();
const roomStates = new Map<string, RoomState>();

function getRoomClients(roomId: string): ChatClient[] {
  return Array.from(clients.values()).filter((c) => c.roomId === roomId);
}

function broadcastToRoom(roomId: string, data: object, exclude?: WebSocket) {
  const msg = JSON.stringify(data);
  getRoomClients(roomId).forEach((c) => {
    if (c.ws !== exclude && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  });
}

function sendToClient(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastPresence(roomId: string) {
  const users = getRoomClients(roomId).map((c) => ({
    userId: c.userId,
    username: c.username,
    isOnline: true,
    joinedAt: c.joinedAt.toISOString(),
  }));
  broadcastToRoom(roomId, { type: "presence", roomId, users });
}

function getRoomState(roomId: string): RoomState {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, {
      aiMode: false,
      aiContext: [],
      inactivityTimer: null,
      emptyTimer: null,
      messageCleanupTimer: null,
    });
  }
  return roomStates.get(roomId)!;
}

async function resetInactivityTimer(roomId: string) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
  if (!room || !room.inactivityDeleteMinutes) return;

  const state = getRoomState(roomId);
  if (state.inactivityTimer) clearTimeout(state.inactivityTimer);

  const expiresAt = new Date(Date.now() + room.inactivityDeleteMinutes * 60 * 1000);
  await db.update(roomsTable).set({ expiresAt, lastActivityAt: new Date() }).where(eq(roomsTable.id, roomId));

  broadcastToRoom(roomId, {
    type: "timer_update",
    roomId,
    inactivityExpiresAt: expiresAt.toISOString(),
    emptyExpiresAt: null,
  });

  state.inactivityTimer = setTimeout(async () => {
    await deleteRoom(roomId, "inactivity");
  }, room.inactivityDeleteMinutes * 60 * 1000);
}

async function startEmptyTimer(roomId: string) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
  if (!room) return;

  const minutes = room.emptyDeleteMinutes ?? 15;
  const state = getRoomState(roomId);
  if (state.emptyTimer) clearTimeout(state.emptyTimer);

  const emptyExpiresAt = new Date(Date.now() + minutes * 60 * 1000);
  broadcastToRoom(roomId, {
    type: "timer_update",
    roomId,
    inactivityExpiresAt: room.expiresAt?.toISOString() ?? null,
    emptyExpiresAt: emptyExpiresAt.toISOString(),
  });

  state.emptyTimer = setTimeout(async () => {
    if (getRoomClients(roomId).length === 0) {
      await deleteRoom(roomId, "empty");
    }
  }, minutes * 60 * 1000);
}

function cancelEmptyTimer(roomId: string) {
  const state = getRoomState(roomId);
  if (state.emptyTimer) {
    clearTimeout(state.emptyTimer);
    state.emptyTimer = null;
  }
}

async function startMessageCleanup(roomId: string) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
  if (!room || !room.messageRetentionHours) return;

  const state = getRoomState(roomId);
  if (state.messageCleanupTimer) clearInterval(state.messageCleanupTimer);

  // Clean up old messages every 5 minutes
  state.messageCleanupTimer = setInterval(async () => {
    const cutoff = new Date(Date.now() - (room.messageRetentionHours ?? 24) * 60 * 60 * 1000);
    await db
      .delete(chatMessagesTable)
      .where(and(eq(chatMessagesTable.roomId, roomId), lt(chatMessagesTable.createdAt, cutoff)));
    broadcastToRoom(roomId, { type: "messages_cleared", roomId });
  }, 5 * 60 * 1000);
}

async function deleteRoom(roomId: string, reason: string) {
  logger.info({ roomId, reason }, "Deleting room");
  broadcastToRoom(roomId, { type: "room_deleted", roomId, reason });
  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.roomId, roomId));
  await db.delete(roomsTable).where(eq(roomsTable.id, roomId));

  const state = roomStates.get(roomId);
  if (state) {
    if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
    if (state.emptyTimer) clearTimeout(state.emptyTimer);
    if (state.messageCleanupTimer) clearInterval(state.messageCleanupTimer);
    roomStates.delete(roomId);
  }

  // Disconnect all clients in the room
  getRoomClients(roomId).forEach((c) => {
    c.ws.close();
    clients.delete(c.ws);
  });
}

async function handleMessage(ws: WebSocket, client: ChatClient, data: unknown) {
  if (typeof data !== "object" || data === null) return;
  const msg = data as Record<string, unknown>;

  if (msg.type === "message") {
    const content = String(msg.content ?? "").trim();
    if (!content) return;

    const state = getRoomState(client.roomId);

    // Handle /ai command
    if (content === "/ai") {
      state.aiMode = true;
      state.aiContext = [];
      const systemMsg = {
        id: randomUUID(),
        roomId: client.roomId,
        userId: "system",
        username: "System",
        content: "AI mode activated. Ask me anything! Type \\ai to deactivate.",
        isAi: true,
        createdAt: new Date().toISOString(),
      };
      broadcastToRoom(client.roomId, { type: "message", message: systemMsg });
      broadcastToRoom(client.roomId, { type: "ai_mode", roomId: client.roomId, active: true });
      await resetInactivityTimer(client.roomId);
      return;
    }

    // Handle \ai command (deactivate)
    if (content === "\\ai") {
      state.aiMode = false;
      state.aiContext = [];
      const systemMsg = {
        id: randomUUID(),
        roomId: client.roomId,
        userId: "system",
        username: "System",
        content: "AI mode deactivated.",
        isAi: true,
        createdAt: new Date().toISOString(),
      };
      broadcastToRoom(client.roomId, { type: "message", message: systemMsg });
      broadcastToRoom(client.roomId, { type: "ai_mode", roomId: client.roomId, active: false });
      await resetInactivityTimer(client.roomId);
      return;
    }

    // Save user message
    const messageId = randomUUID();
    const now = new Date();
    const userMessage = {
      id: messageId,
      roomId: client.roomId,
      userId: client.userId,
      username: client.username,
      content,
      isAi: false,
      createdAt: now,
    };

    await db.insert(chatMessagesTable).values(userMessage);
    await db.update(roomsTable).set({ lastActivityAt: now }).where(eq(roomsTable.id, client.roomId));

    broadcastToRoom(client.roomId, {
      type: "message",
      message: { ...userMessage, createdAt: now.toISOString() },
    });

    await resetInactivityTimer(client.roomId);

    // If AI mode is active, generate AI response
    if (state.aiMode) {
      state.aiContext.push({ role: "user", content });

      // Keep context manageable (last 20 messages)
      if (state.aiContext.length > 20) {
        state.aiContext = state.aiContext.slice(-20);
      }

      try {
        const aiMessageId = randomUUID();
        let aiContent = "";

        // Start typing indicator
        broadcastToRoom(client.roomId, { type: "ai_typing", roomId: client.roomId });

        const stream = await openai.chat.completions.create({
          model: "gpt-5.4",
          max_completion_tokens: 2048,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful AI assistant in a global chat room called Global Connect. Be conversational, helpful, and concise. Format responses clearly for a chat interface.",
            },
            ...state.aiContext.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          ],
          stream: true,
        });

        // Stream AI response to clients
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            aiContent += delta;
            broadcastToRoom(client.roomId, {
              type: "ai_chunk",
              roomId: client.roomId,
              messageId: aiMessageId,
              content: delta,
              fullContent: aiContent,
            });
          }
        }

        if (aiContent) {
          const aiNow = new Date();
          const aiMessage = {
            id: aiMessageId,
            roomId: client.roomId,
            userId: "ai",
            username: "Global Connect AI",
            content: aiContent,
            isAi: true,
            createdAt: aiNow,
          };
          await db.insert(chatMessagesTable).values(aiMessage);

          // Store AI response in context
          state.aiContext.push({ role: "assistant", content: aiContent });

          broadcastToRoom(client.roomId, {
            type: "ai_message_complete",
            message: { ...aiMessage, createdAt: aiNow.toISOString() },
          });
        }
      } catch (err) {
        logger.error({ err }, "AI response error");
        broadcastToRoom(client.roomId, {
          type: "ai_error",
          roomId: client.roomId,
          error: "AI failed to respond. Please try again.",
        });
      }
    }
  }
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const username = url.searchParams.get("username") || "Anonymous";
    const roomId = url.searchParams.get("roomId") || "global";
    const userId = url.searchParams.get("userId") || randomUUID();

    logger.info({ userId, username, roomId }, "WebSocket client connected");

    const client: ChatClient = {
      ws,
      userId,
      username,
      roomId,
      joinedAt: new Date(),
    };

    clients.set(ws, client);
    cancelEmptyTimer(roomId);

    // Send message history
    const history = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.roomId, roomId))
      .orderBy(chatMessagesTable.createdAt)
      .limit(100);

    sendToClient(ws, {
      type: "history",
      roomId,
      messages: history.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    });

    // Send current AI mode state
    const state = getRoomState(roomId);
    sendToClient(ws, { type: "ai_mode", roomId, active: state.aiMode });

    // Update room member count and broadcast presence
    const roomClients = getRoomClients(roomId);
    await db
      .update(roomsTable)
      .set({ lastActivityAt: new Date() })
      .where(eq(roomsTable.id, roomId));

    broadcastPresence(roomId);

    // Start message cleanup timer if applicable
    await startMessageCleanup(roomId);

    // Announce user joining
    const joinMsg = {
      id: randomUUID(),
      roomId,
      userId: "system",
      username: "System",
      content: `${username} joined the chat`,
      isAi: false,
      createdAt: new Date().toISOString(),
    };
    broadcastToRoom(roomId, { type: "message", message: joinMsg }, ws);

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        await handleMessage(ws, client, data);
      } catch (err) {
        logger.error({ err }, "Failed to handle WebSocket message");
      }
    });

    ws.on("close", async () => {
      logger.info({ userId, username, roomId }, "WebSocket client disconnected");
      clients.delete(ws);

      broadcastPresence(roomId);

      // Announce user leaving
      const leaveMsg = {
        id: randomUUID(),
        roomId,
        userId: "system",
        username: "System",
        content: `${username} left the chat`,
        isAi: false,
        createdAt: new Date().toISOString(),
      };
      broadcastToRoom(roomId, { type: "message", message: leaveMsg });

      // Start empty timer if room is now empty (for private rooms)
      if (getRoomClients(roomId).length === 0) {
        const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
        if (room && room.isPrivate) {
          await startEmptyTimer(roomId);
        }
      }
    });

    ws.on("error", (err) => {
      logger.error({ err, userId, roomId }, "WebSocket error");
    });
  });

  logger.info("WebSocket server initialized at /ws");
  return wss;
}

export function getOnlineUsersForRoom(roomId: string) {
  return getRoomClients(roomId).map((c) => ({
    userId: c.userId,
    username: c.username,
    isOnline: true,
    joinedAt: c.joinedAt.toISOString(),
  }));
}

export function getTotalOnlineUsers() {
  return clients.size;
}

/**
 * Messaging Service
 * Functions related to conversations, messages, and in-memory fallback.
 */

import { pool, toStringOrNull, toNumberOrNull } from './_helpers';

// ========================================
// In-memory stores (fallback when DB unavailable)
// ========================================

interface InMemoryConversationRecord {
  id: string;
  userId: string;
  context: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface InMemoryMessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

const messagingConversationStore = new Map<string, InMemoryConversationRecord>();
const messagingMessageStore = new Map<string, InMemoryMessageRecord>();

export const messagingService = {
  parseJsonObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return {};
      }
    }

    return {};
  },
  extractParticipantIds(context: Record<string, unknown>, ownerUserId?: string | null): string[] {
    const participantIdsRaw = context.participantIds;
    const participantIds = Array.isArray(participantIdsRaw)
      ? participantIdsRaw.filter((value): value is string => typeof value === 'string')
      : [];

    if (ownerUserId && !participantIds.includes(ownerUserId)) {
      participantIds.push(ownerUserId);
    }

    return Array.from(new Set(participantIds));
  },
  normalizeConversation(row: Record<string, unknown> | null) {
    if (!row) {
      return null;
    }

    const context = this.parseJsonObject(row.context);
    const ownerUserId = toStringOrNull(row.user_id ?? row.userId);
    const participantIds = this.extractParticipantIds(context, ownerUserId);
    const lastMessageId = toStringOrNull(row.last_message_id);
    const lastMessageTimestamp = row.last_message_timestamp ?? null;

    return {
      id: row.id,
      userId: ownerUserId,
      user_id: ownerUserId,
      type: toStringOrNull(context.type) ?? 'direct',
      subject: toStringOrNull(context.subject),
      description: toStringOrNull(context.description),
      participantIds,
      participant_ids: participantIds,
      relatedTourId: context.relatedTourId ?? null,
      relatedBookingId: context.relatedBookingId ?? null,
      relatedReviewId: context.relatedReviewId ?? null,
      lastMessage: lastMessageId
        ? {
            id: lastMessageId,
            content: toStringOrNull(row.last_message_content) ?? '',
            role: toStringOrNull(row.last_message_role) ?? 'user',
            timestamp: lastMessageTimestamp,
          }
        : null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
      context,
    };
  },
  normalizeMessage(row: Record<string, unknown> | null) {
    if (!row) {
      return null;
    }

    const metadata = this.parseJsonObject(row.metadata);
    const senderId = toStringOrNull(metadata.senderId ?? metadata.sender_id ?? row.session_user_id);
    const conversationId = row.session_id ?? row.sessionId ?? null;

    return {
      id: row.id,
      conversationId,
      conversation_id: conversationId,
      senderId,
      sender_id: senderId,
      role: toStringOrNull(row.role) ?? 'user',
      type: toStringOrNull(metadata.type) ?? 'text',
      content: toStringOrNull(row.content) ?? '',
      attachments: Array.isArray(metadata.attachments) ? metadata.attachments : [],
      repliedToMessageId: metadata.repliedToMessageId ?? metadata.replied_to_message_id ?? null,
      metadata,
      timestamp: row.timestamp ?? null,
      createdAt: row.timestamp ?? row.created_at ?? row.createdAt ?? null,
      updatedAt: row.timestamp ?? row.updated_at ?? row.updatedAt ?? null,
    };
  },
  async isConversationMember(conversationId: string, userId: string) {
    try {
      const result = await pool.query(
        `SELECT 1
         FROM chat_sessions s
         WHERE s.id = $1
           AND (
             s.user_id = $2
             OR COALESCE(s.context->'participantIds', '[]'::jsonb) ? $2
           )
         LIMIT 1`,
        [conversationId, userId]
      );
      return result.rows.length > 0;
    } catch {
      const localConversation = messagingConversationStore.get(conversationId);
      if (!localConversation) {
        return false;
      }
      const context = this.parseJsonObject(localConversation.context);
      const participantIds = this.extractParticipantIds(context, localConversation.userId);
      return participantIds.includes(userId);
    }
  },
  async send(data: Record<string, unknown>) {
    const senderId = toStringOrNull(data.senderId) ?? toStringOrNull(data.userId);
    if (!senderId) {
      return { messageId: null, status: 'failed' };
    }

    const message = await this.sendMessage(data, senderId);
    if (!message) {
      return { messageId: null, status: 'forbidden_or_not_found' };
    }

    return { messageId: message.id, status: 'sent' };
  },
  async list(params: Record<string, unknown>) {
    const conversationId = toStringOrNull(params.conversationId) ?? toStringOrNull(params.sessionId);
    const userId = toStringOrNull(params.userId);
    const limit = Math.min(Math.max(toNumberOrNull(params.limit) ?? 50, 1), 100);
    const offset = Math.max(toNumberOrNull(params.offset) ?? 0, 0);

    if (!conversationId) {
      return { messages: [], total: 0 };
    }

    const result = await this.getMessages(conversationId, {}, limit, offset, userId ?? undefined);
    if (!result) {
      return { messages: [], total: 0 };
    }

    return { messages: result.messages, total: result.total };
  },
  async getMessages(
    conversationId: string,
    filters: Record<string, unknown>,
    limit = 50,
    offset = 0,
    userId?: string
  ) {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const normalizedOffset = Math.max(offset, 0);

    try {
      if (userId) {
        const member = await this.isConversationMember(conversationId, userId);
        if (!member) {
          return null;
        }
      } else {
        const existsResult = await pool.query(
          `SELECT 1 FROM chat_sessions WHERE id = $1 LIMIT 1`,
          [conversationId]
        );
        if (existsResult.rows.length === 0) {
          return null;
        }
      }

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM chat_messages
         WHERE session_id = $1`,
        [conversationId]
      );
      const total = Number(countResult.rows[0]?.total ?? 0);

      const result = await pool.query(
        `SELECT
           m.*,
           s.user_id AS session_user_id,
           s.context AS session_context
         FROM chat_messages m
         JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.session_id = $1
         ORDER BY m.timestamp ASC
         LIMIT $2 OFFSET $3`,
        [conversationId, normalizedLimit, normalizedOffset]
      );

      return {
        messages: result.rows.map(row => this.normalizeMessage(row)),
        total,
        conversationId,
        limit: normalizedLimit,
        offset: normalizedOffset,
        filters,
      };
    } catch {
      const localConversation = messagingConversationStore.get(conversationId);
      if (!localConversation) {
        return null;
      }

      const context = this.parseJsonObject(localConversation.context);
      const participantIds = this.extractParticipantIds(context, localConversation.userId);
      if (userId && !participantIds.includes(userId)) {
        return null;
      }

      const allMessages = Array.from(messagingMessageStore.values())
        .filter(message => message.sessionId === conversationId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      const paginatedMessages = allMessages
        .slice(normalizedOffset, normalizedOffset + normalizedLimit)
        .map(message => this.normalizeMessage({
          ...message,
          session_user_id: localConversation.userId,
        }));

      return {
        messages: paginatedMessages,
        total: allMessages.length,
        conversationId,
        limit: normalizedLimit,
        offset: normalizedOffset,
        filters,
      };
    }
  },
  async getMessage(id: string) {
    try {
      const result = await pool.query(
        `SELECT
           m.*,
           s.user_id AS session_user_id,
           s.context AS session_context
         FROM chat_messages m
         JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.id = $1
         LIMIT 1`,
        [id]
      );
      return this.normalizeMessage(result.rows[0] ?? null);
    } catch {
      const localMessage = messagingMessageStore.get(id);
      if (!localMessage) {
        return null;
      }

      const localConversation = messagingConversationStore.get(localMessage.sessionId);
      return this.normalizeMessage({
        ...localMessage,
        session_user_id: localConversation?.userId ?? null,
        session_context: localConversation?.context ?? {},
      });
    }
  },
  async getMessageForUser(id: string, userId: string) {
    try {
      const result = await pool.query(
        `SELECT
           m.*,
           s.user_id AS session_user_id,
           s.context AS session_context
         FROM chat_messages m
         JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.id = $1
           AND (
             s.user_id = $2
             OR COALESCE(s.context->'participantIds', '[]'::jsonb) ? $2
           )
         LIMIT 1`,
        [id, userId]
      );

      return this.normalizeMessage(result.rows[0] ?? null);
    } catch {
      const localMessage = messagingMessageStore.get(id);
      if (!localMessage) {
        return null;
      }

      const localConversation = messagingConversationStore.get(localMessage.sessionId);
      if (!localConversation) {
        return null;
      }

      const context = this.parseJsonObject(localConversation.context);
      const participantIds = this.extractParticipantIds(context, localConversation.userId);
      if (!participantIds.includes(userId)) {
        return null;
      }

      return this.normalizeMessage({
        ...localMessage,
        session_user_id: localConversation.userId,
        session_context: localConversation.context,
      });
    }
  },
  async sendMessage(data: Record<string, unknown>, senderId: string) {
    const conversationId = toStringOrNull(data.conversationId) ?? toStringOrNull(data.sessionId);
    const content = toStringOrNull(data.content)?.trim() ?? '';
    const type = toStringOrNull(data.type) ?? 'text';
    const attachments = Array.isArray(data.attachments) ? data.attachments : [];
    const repliedToMessageId = toStringOrNull(data.repliedToMessageId);

    if (!conversationId || !content) {
      return null;
    }

    const member = await this.isConversationMember(conversationId, senderId);
    if (!member) {
      return null;
    }

    try {
      const metadata = {
        senderId,
        type,
        attachments,
        repliedToMessageId,
      };

      const insertResult = await pool.query(
        `INSERT INTO chat_messages (session_id, role, content, timestamp, metadata)
         VALUES ($1, 'user', $2, NOW(), $3::jsonb)
         RETURNING id`,
        [conversationId, content, JSON.stringify(metadata)]
      );

      const insertedMessageId = toStringOrNull(insertResult.rows[0]?.id);
      if (!insertedMessageId) {
        return null;
      }

      await pool.query(
        `UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`,
        [conversationId]
      );

      return this.getMessage(insertedMessageId);
    } catch {
      const localConversation = messagingConversationStore.get(conversationId);
      if (!localConversation) {
        return null;
      }

      const localContext = this.parseJsonObject(localConversation.context);
      const participantIds = this.extractParticipantIds(localContext, localConversation.userId);
      if (!participantIds.includes(senderId)) {
        return null;
      }

      const nowIso = new Date().toISOString();
      const localMessageId = crypto.randomUUID();
      const metadata: Record<string, unknown> = {
        senderId,
        type,
        attachments,
        repliedToMessageId,
      };

      messagingMessageStore.set(localMessageId, {
        id: localMessageId,
        sessionId: conversationId,
        role: 'user',
        content,
        metadata,
        timestamp: nowIso,
      });

      messagingConversationStore.set(conversationId, {
        ...localConversation,
        updatedAt: nowIso,
      });

      return this.normalizeMessage({
        id: localMessageId,
        session_id: conversationId,
        role: 'user',
        content,
        metadata,
        timestamp: nowIso,
        session_user_id: localConversation.userId,
        session_context: localConversation.context,
      });
    }
  },
  async markAsRead(id: string, userId: string, bypassMembership = false) {
    const currentMessage = bypassMembership
      ? await this.getMessage(id)
      : await this.getMessageForUser(id, userId);
    if (!currentMessage) {
      return false;
    }

    try {
      await pool.query(
        `UPDATE chat_messages
         SET metadata = COALESCE(metadata, '{}'::jsonb)
           || jsonb_build_object('lastReadBy', $2, 'lastReadAt', NOW())
         WHERE id = $1`,
        [id, userId]
      );
    } catch {
      const localMessage = messagingMessageStore.get(id);
      if (localMessage) {
        messagingMessageStore.set(id, {
          ...localMessage,
          metadata: {
            ...localMessage.metadata,
            lastReadBy: userId,
            lastReadAt: new Date().toISOString(),
          },
        });
      }
    }

    return true;
  },
  async deleteMessage(id: string, userId: string, bypassMembership = false) {
    if (bypassMembership) {
      try {
        const result = await pool.query(
          `DELETE FROM chat_messages WHERE id = $1 RETURNING id`,
          [id]
        );
        return result.rows.length > 0;
      } catch {
        return messagingMessageStore.delete(id);
      }
    }

    try {
      const result = await pool.query(
        `DELETE FROM chat_messages m
         USING chat_sessions s
         WHERE m.session_id = s.id
           AND m.id = $1
           AND (
             s.user_id = $2
             OR COALESCE(s.context->'participantIds', '[]'::jsonb) ? $2
           )
         RETURNING m.id`,
        [id, userId]
      );
      return result.rows.length > 0;
    } catch {
      const localMessage = messagingMessageStore.get(id);
      if (!localMessage) {
        return false;
      }

      const localConversation = messagingConversationStore.get(localMessage.sessionId);
      if (!localConversation) {
        return false;
      }

      const context = this.parseJsonObject(localConversation.context);
      const participantIds = this.extractParticipantIds(context, localConversation.userId);
      if (!participantIds.includes(userId)) {
        return false;
      }

      return messagingMessageStore.delete(id);
    }
  },
  async listConversations(
    userId: string,
    filters: Record<string, unknown>,
    limit = 50,
    offset = 0
  ) {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const normalizedOffset = Math.max(offset, 0);

    try {
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM chat_sessions s
         WHERE
           s.user_id = $1
           OR COALESCE(s.context->'participantIds', '[]'::jsonb) ? $1`,
        [userId]
      );
      const total = Number(countResult.rows[0]?.total ?? 0);

      const result = await pool.query(
        `SELECT
           s.*,
           lm.id AS last_message_id,
           lm.content AS last_message_content,
           lm.role AS last_message_role,
           lm.timestamp AS last_message_timestamp
         FROM chat_sessions s
         LEFT JOIN LATERAL (
           SELECT id, content, role, timestamp
           FROM chat_messages m
           WHERE m.session_id = s.id
           ORDER BY timestamp DESC
           LIMIT 1
         ) lm ON TRUE
         WHERE
           s.user_id = $1
           OR COALESCE(s.context->'participantIds', '[]'::jsonb) ? $1
         ORDER BY COALESCE(lm.timestamp, s.updated_at) DESC
         LIMIT $2 OFFSET $3`,
        [userId, normalizedLimit, normalizedOffset]
      );

      return {
        conversations: result.rows.map(row => this.normalizeConversation(row)),
        total,
        limit: normalizedLimit,
        offset: normalizedOffset,
        filters,
        userId,
      };
    } catch {
      const userConversations = Array.from(messagingConversationStore.values())
        .filter(conversation => {
          const context = this.parseJsonObject(conversation.context);
          const participantIds = this.extractParticipantIds(context, conversation.userId);
          return participantIds.includes(userId);
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      return {
        conversations: userConversations
          .slice(normalizedOffset, normalizedOffset + normalizedLimit)
          .map(conversation => this.normalizeConversation({
            id: conversation.id,
            user_id: conversation.userId,
            context: conversation.context,
            created_at: conversation.createdAt,
            updated_at: conversation.updatedAt,
          })),
        total: userConversations.length,
        limit: normalizedLimit,
        offset: normalizedOffset,
        filters,
        userId,
      };
    }
  },
  async createConversation(data: Record<string, unknown>, createdBy: string) {
    const inputParticipantIds = Array.isArray(data.participantIds)
      ? data.participantIds.filter((value): value is string => typeof value === 'string')
      : [];
    const participantIds = Array.from(new Set([createdBy, ...inputParticipantIds]));

    const context: Record<string, unknown> = {
      type: toStringOrNull(data.type) ?? 'direct',
      subject: toStringOrNull(data.subject),
      description: toStringOrNull(data.description),
      relatedTourId: data.relatedTourId ?? null,
      relatedBookingId: data.relatedBookingId ?? null,
      relatedReviewId: data.relatedReviewId ?? null,
      participantIds,
      createdBy,
    };

    try {
      const sessionResult = await pool.query(
        `INSERT INTO chat_sessions (user_id, context, created_at, updated_at)
         VALUES ($1, $2::jsonb, NOW(), NOW())
         RETURNING *`,
        [createdBy, JSON.stringify(context)]
      );

      const conversation = this.normalizeConversation(sessionResult.rows[0] ?? null);
      if (!conversation) {
        return null;
      }

      const firstMessage = toStringOrNull(data.firstMessage)?.trim();
      if (firstMessage) {
        const createdMessage = await this.sendMessage(
          {
            conversationId: conversation.id,
            type: 'text',
            content: firstMessage,
          },
          createdBy
        );
        if (createdMessage) {
          return {
            ...conversation,
            lastMessage: {
              id: createdMessage.id,
              content: createdMessage.content,
              role: createdMessage.role,
              timestamp: createdMessage.timestamp,
            },
          };
        }
      }

      return conversation;
    } catch {
      const nowIso = new Date().toISOString();
      const conversationId = crypto.randomUUID();
      const localConversation: InMemoryConversationRecord = {
        id: conversationId,
        userId: createdBy,
        context,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      messagingConversationStore.set(conversationId, localConversation);

      const firstMessage = toStringOrNull(data.firstMessage)?.trim();
      if (firstMessage) {
        await this.sendMessage(
          {
            conversationId,
            type: 'text',
            content: firstMessage,
          },
          createdBy
        );
      }

      return this.normalizeConversation({
        id: conversationId,
        user_id: createdBy,
        context,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
  },
};

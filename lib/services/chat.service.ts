import { query } from '@/lib/database';
import {
  ConversationRow,
  ConversationParticipantRow,
  ConversationMessageRow,
  ConversationListRow,
  UnreadCountRow,
  MessageWithSenderRow,
  CountRow,
} from '@/lib/types/db-rows';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface CreateConversationParams {
  type?: 'direct' | 'group' | 'support';
  subject?: string;
  bookingId?: string;
  tourId?: number;
  createdBy: string;
  participants: Array<{ userId: string; role: string }>;
  initialMessage?: string;
}

interface SendMessageParams {
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: 'text' | 'system' | 'image';
  attachments?: unknown[];
}

interface ListConversationsParams {
  userId: string;
  limit?: number;
  offset?: number;
}

interface GetMessagesParams {
  conversationId: string;
  userId: string;
  limit?: number;
  offset?: number;
  after?: string;
}

// ──────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────

class ChatService {
  /**
   * Check if user is a participant in a conversation.
   */
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const result = await query<CountRow>(
      `SELECT COUNT(*) FROM conversation_participants
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Get or create a direct conversation between two users.
   * If a direct conversation already exists, return it instead of creating a duplicate.
   */
  async getOrCreateDirect(
    user1Id: string,
    user1Role: string,
    user2Id: string,
    user2Role: string,
    options?: { bookingId?: string; tourId?: number; subject?: string }
  ): Promise<{ conversationId: string; created: boolean }> {
    // Find existing direct conversation between these two users
    const existing = await query<{ id: string }>(
      `SELECT c.id
       FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
       WHERE c.type = 'direct'
       LIMIT 1`,
      [user1Id, user2Id]
    );

    if (existing.rows.length > 0) {
      return { conversationId: existing.rows[0].id, created: false };
    }

    // Create new conversation
    const conv = await this.createConversation({
      type: 'direct',
      createdBy: user1Id,
      subject: options?.subject,
      bookingId: options?.bookingId,
      tourId: options?.tourId,
      participants: [
        { userId: user1Id, role: user1Role },
        { userId: user2Id, role: user2Role },
      ],
    });

    return { conversationId: conv.id, created: true };
  }

  /**
   * Create a new conversation with participants.
   */
  async createConversation(params: CreateConversationParams): Promise<ConversationRow> {
    const {
      type = 'direct',
      subject,
      bookingId,
      tourId,
      createdBy,
      participants,
      initialMessage,
    } = params;

    // Insert conversation
    const convResult = await query<ConversationRow>(
      `INSERT INTO conversations (type, subject, booking_id, tour_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type, subject || null, bookingId || null, tourId || null, createdBy]
    );
    const conversation = convResult.rows[0];

    // Insert participants
    for (const p of participants) {
      await query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [conversation.id, p.userId, p.role]
      );
    }

    // Send initial message if provided
    if (initialMessage) {
      await this.sendMessage({
        conversationId: conversation.id,
        senderId: createdBy,
        content: initialMessage,
      });
    }

    return conversation;
  }

  /**
   * Send a message in a conversation.
   * Validates sender is a participant.
   */
  async sendMessage(params: SendMessageParams): Promise<ConversationMessageRow> {
    const {
      conversationId,
      senderId,
      content,
      messageType = 'text',
      attachments = [],
    } = params;

    // Verify membership
    const isMember = await this.isParticipant(conversationId, senderId);
    if (!isMember) {
      throw new Error('NOT_PARTICIPANT');
    }

    // Insert message
    const result = await query<ConversationMessageRow>(
      `INSERT INTO conversation_messages (conversation_id, sender_id, content, message_type, attachments)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [conversationId, senderId, content, messageType, JSON.stringify(attachments)]
    );

    // Update conversation timestamp
    await query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    return result.rows[0];
  }

  /**
   * Get paginated messages for a conversation.
   * Supports delta fetch via `after` timestamp.
   */
  async getMessages(params: GetMessagesParams): Promise<{
    messages: MessageWithSenderRow[];
    total: number;
  }> {
    const { conversationId, userId, limit = 50, offset = 0, after } = params;

    // Verify membership (admin bypass: check role)
    const isMember = await this.isParticipant(conversationId, userId);
    if (!isMember) {
      throw new Error('NOT_PARTICIPANT');
    }

    const conditions = ['m.conversation_id = $1', 'm.is_deleted = FALSE'];
    const values: (string | number)[] = [conversationId];
    let idx = 2;

    if (after) {
      conditions.push(`m.created_at > $${idx}`);
      values.push(after);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    // Count
    const countResult = await query<CountRow>(
      `SELECT COUNT(*) FROM conversation_messages m WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch messages with sender info
    values.push(limit, offset);
    const messagesResult = await query<MessageWithSenderRow>(
      `SELECT m.*, u.name as sender_name,
              COALESCE(cp.role, 'unknown') as sender_role
       FROM conversation_messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN conversation_participants cp
         ON cp.conversation_id = m.conversation_id AND cp.user_id = m.sender_id
       WHERE ${whereClause}
       ORDER BY m.created_at ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    return { messages: messagesResult.rows, total };
  }

  /**
   * List conversations for a user with last message and unread count.
   */
  async listConversations(params: ListConversationsParams): Promise<{
    conversations: ConversationListRow[];
    total: number;
  }> {
    const { userId, limit = 50, offset = 0 } = params;

    // Count total conversations for this user
    const countResult = await query<CountRow>(
      `SELECT COUNT(*)
       FROM conversation_participants cp
       WHERE cp.user_id = $1`,
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    // List conversations with last message, unread count, and other participant info
    const result = await query<ConversationListRow>(
      `SELECT
         c.id,
         c.type,
         c.subject,
         c.booking_id,
         c.tour_id,
         c.created_at,
         c.updated_at,
         lm.content as last_message_content,
         lm.created_at as last_message_at,
         lm.sender_id as last_message_sender_id,
         lm_user.name as last_message_sender_name,
         (
           SELECT COUNT(*)
           FROM conversation_messages cm
           WHERE cm.conversation_id = c.id
             AND cm.is_deleted = FALSE
             AND cm.created_at > COALESCE(my.last_read_at, '1970-01-01')
             AND cm.sender_id != $1
         )::text as unread_count,
         other_p.name as other_participant_name,
         other_cp.role as other_participant_role,
         other_cp.user_id as other_participant_id
       FROM conversations c
       JOIN conversation_participants my ON my.conversation_id = c.id AND my.user_id = $1
       LEFT JOIN LATERAL (
         SELECT content, created_at, sender_id
         FROM conversation_messages
         WHERE conversation_id = c.id AND is_deleted = FALSE
         ORDER BY created_at DESC
         LIMIT 1
       ) lm ON TRUE
       LEFT JOIN users lm_user ON lm_user.id = lm.sender_id
       LEFT JOIN conversation_participants other_cp
         ON other_cp.conversation_id = c.id AND other_cp.user_id != $1
       LEFT JOIN users other_p ON other_p.id = other_cp.user_id
       ORDER BY COALESCE(lm.created_at, c.created_at) DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return { conversations: result.rows, total };
  }

  /**
   * Mark a conversation as read for a user (sets last_read_at = NOW()).
   */
  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    const result = await query(
      `UPDATE conversation_participants
       SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get unread message counts per conversation for a user.
   */
  async getUnreadCounts(userId: string): Promise<UnreadCountRow[]> {
    const result = await query<UnreadCountRow>(
      `SELECT
         cp.conversation_id,
         COUNT(cm.id)::text as unread_count
       FROM conversation_participants cp
       JOIN conversation_messages cm
         ON cm.conversation_id = cp.conversation_id
         AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01')
         AND cm.sender_id != $1
         AND cm.is_deleted = FALSE
       WHERE cp.user_id = $1
       GROUP BY cp.conversation_id
       HAVING COUNT(cm.id) > 0`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get total unread count across all conversations for a user.
   */
  async getTotalUnread(userId: string): Promise<number> {
    const result = await query<{ total: string }>(
      `SELECT COALESCE(SUM(sub.cnt), 0)::text as total
       FROM (
         SELECT COUNT(cm.id) as cnt
         FROM conversation_participants cp
         JOIN conversation_messages cm
           ON cm.conversation_id = cp.conversation_id
           AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01')
           AND cm.sender_id != $1
           AND cm.is_deleted = FALSE
         WHERE cp.user_id = $1
         GROUP BY cp.conversation_id
       ) sub`,
      [userId]
    );
    return parseInt(result.rows[0].total);
  }

  /**
   * Get participants of a conversation.
   */
  async getParticipants(conversationId: string): Promise<Array<ConversationParticipantRow & { name: string; email: string }>> {
    const result = await query<ConversationParticipantRow & { name: string; email: string }>(
      `SELECT cp.*, u.name, u.email
       FROM conversation_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = $1`,
      [conversationId]
    );
    return result.rows;
  }

  /**
   * Soft-delete a message (only sender or admin can delete).
   */
  async deleteMessage(messageId: string, userId: string, isAdmin = false): Promise<boolean> {
    const condition = isAdmin
      ? 'id = $1'
      : 'id = $1 AND sender_id = $2';
    const params = isAdmin ? [messageId] : [messageId, userId];

    const result = await query(
      `UPDATE conversation_messages SET is_deleted = TRUE, content = ''
       WHERE ${condition}`,
      params
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const chatService = new ChatService();

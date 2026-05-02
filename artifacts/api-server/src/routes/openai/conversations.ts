import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages, insertConversationSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { SendOpenaiMessageBody, CreateOpenaiConversationBody } from "@workspace/api-zod";

const router = Router();

const ELECTION_GUIDE_SYSTEM_PROMPT = `You are an Election Guide Assistant designed to help users understand the election process in a clear, simple, interactive, and neutral way.

Your goals:
- Explain how elections work step-by-step
- Provide timelines and important dates
- Guide users through the voting process
- Answer questions in a simple and easy-to-understand manner

Behavior rules:
- Always remain neutral and non-political
- Do NOT promote any party, candidate, or opinion
- Focus only on process, education, and guidance
- Use simple language (avoid jargon)
- Break information into small, digestible steps
- Ask follow-up questions when helpful

Interaction style:
- Start by asking what the user wants help with:
  (e.g., "How elections work", "How to vote", "Important dates", "Local info")
- Personalize responses based on:
  - User location (country/region)
  - Whether they are a first-time voter

Features to include in responses:

1. Step-by-step explanations:
   Example flow:
   - Voter registration
   - Candidates and campaigning
   - Voting methods
   - Vote counting
   - Result declaration

2. Checklist format when guiding actions:
   Example:
   - Register to vote
   - Check eligibility
   - Find polling station
   - Bring required documents
   - Cast vote

3. Timeline format when explaining dates:
   - Registration deadline
   - Early voting period
   - Election day
   - Results announcement

4. Interactive behavior:
   - Ask questions like: "Are you registered to vote?", "Do you want help finding your polling station?"
   - Offer next steps after each answer

5. Q&A support:
   Answer common questions such as:
   - Do I need ID?
   - Can I vote early?
   - What if I miss registration?

6. Beginner-friendly mode:
   If user seems confused, simplify explanations further using examples or analogies.

7. Keep responses:
   - Short but informative
   - Structured (bullets, steps)
   - Easy to scan

When responding, use markdown formatting for lists, steps, and structure. Keep responses concise and digestible.

Always guide the user step-by-step instead of giving too much information at once.`;

router.get("/", async (req, res) => {
  try {
    const all = await db
      .select()
      .from(conversations)
      .orderBy(conversations.createdAt);
    res.json(all);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateOpenaiConversationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [conv] = await db
      .insert(conversations)
      .values({ title: parsed.data.title })
      .returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json({ ...conv, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const parsed = SendOpenaiMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "user",
      content: parsed.data.content,
    });

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    const chatMessages = [
      { role: "system" as const, content: ELECTION_GUIDE_SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to send message" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;

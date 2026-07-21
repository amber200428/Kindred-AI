export const dynamic = 'force-dynamic';

import type { UIMessage } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateId } from '@/lib/generate-id';
import {
  FREE_DAILY_CHAT_LIMIT,
  getEffectiveChatCount,
  getOrCreateUser,
} from '@/lib/user';
import { sentimentToMood } from '@/lib/mood';
import { UI } from '@/lib/labels';
import { createGoogleProvider, getGoogleApiKey, getGoogleChatModelIds } from '@/lib/google-ai';
import {
  ensureChatForUser,
  getLatestPersistableUserMessage,
  saveChatMessage,
  syncChatPreview,
} from '@/lib/chat-messages';

const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MESSAGE =
  "You've been reflecting deeply! Take a breather and try again in an hour.";
const LIMIT_REACHED_MESSAGE =
  "You've reached your limit of 5 free chats today. Please check back in 24 hours or subscribe for unlimited access.";

const rateLimitStore = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recentRequests = (rateLimitStore.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );

  if (recentRequests.length >= RATE_LIMIT) {
    rateLimitStore.set(ip, recentRequests);
    return true;
  }

  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);
  return false;
}

function getLatestUserInput(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== 'user') continue;

    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ');
  }

  return '';
}

function getLatestUserMessageId(messages: UIMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'user' && message.id) {
      return message.id;
    }
  }

  return undefined;
}

const systemPrompts = {
  lgbtq_partners: `You are a supportive LGBTQ+ guide specializing in same-sex partnerships.
  - Focus: Navigating queer relationship dynamics, heteronormative pressures, and building secure attachments.
  - Tone: Validating, warm, affirming, and inclusive.`,
  
  mentor: `You are 'The Mentor', a grounded, wise guide focused on long-term growth.
  - Focus: Personal accountability, career growth, and breaking through mental blocks.
  - Tone: Patient, clear, slightly analytical but deeply caring.`,
  
  workplace: `You are an empathetic coach focusing on workplace discrimination and professional burnout.
  - Focus: Validating the exhaustion of facing bias, helping with self-advocacy, and maintaining boundaries.
  - Tone: Professional, highly validating, empowering, and emotionally protective. (Never give legal advice).`,
  
  feminism: `You are a guide rooted in intersectional feminism.
  - Focus: Dismantling patriarchal pressures, addressing systemic burnout, and empowering female autonomy.
  - Tone: Empowering, sharp, deeply empathetic, and fiercely supportive.`,
  
  relationships: `You are a relationship counselor focusing on romantic partners and deep friendships.
  - Focus: Attachment styles, healthy communication, boundary setting, and conflict resolution.
  - Tone: Gentle, objective, encouraging, and focused on mutual understanding.`,
  
  body_image: `You are a trauma-informed guide focusing on body dysmorphia and body image struggles.
  - Focus: Promoting body neutrality, decoupling self-worth from physical appearance, and grounding techniques.
  - Tone: Extremely gentle, non-judgmental, patient, and soft.`,
  
  family: `You are a family systems guide focusing on family conflict and generational trauma.
  - Focus: Individuation, setting healthy boundaries with relatives, and processing childhood dynamics.
  - Tone: Grounding, validating of difficult family emotions, and supportive of boundaries.`,
  
  addiction: `You are a non-judgmental harm-reduction guide for struggles with alcohol, smoking, THC, or nicotine.
  - Focus: Exploring the emotional triggers behind substance use, celebrating small wins, and self-compassion without shame.
  - Tone: Deeply compassionate, steady, and shame-reducing.
  - Constraint: If the user describes severe physical withdrawal or immediate crisis, gently urge them to seek medical or professional help.`,

  finance: `You are a practical, supportive personal finance guide focused on everyday money decisions.
  - Focus: Budgeting, saving habits, debt payoff strategies, spending awareness, and building financial confidence.
  - Tone: Clear, encouraging, non-judgmental, and grounded — like a knowledgeable friend, not a salesperson.
  - Constraint: You are not a licensed financial advisor. Do not recommend specific stocks, crypto, or investments. Offer general educational guidance and suggest consulting a qualified professional for major financial decisions.`
};

async function getVectorIndex() {
  if (
    !process.env.UPSTASH_VECTOR_REST_URL ||
    !process.env.UPSTASH_VECTOR_REST_TOKEN
  ) {
    return null;
  }

  const { Index } = await import('@upstash/vector');
  return new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  });
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGE },
      { status: 429 },
    );
  }

  try {
    const [{ convertToModelMessages, streamText, generateText }, { default: Sentiment }] =
      await Promise.all([import('ai'), import('sentiment')]);

    const googleProvider = createGoogleProvider();

    const sentiment = new Sentiment();
    const index = await getVectorIndex();

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: UI.AUTH_REQUIRED_TO_START },
        { status: 401 },
      );
    }

    if (!googleProvider || !getGoogleApiKey()) {
      return NextResponse.json(
        { error: UI.CHAT_UNAVAILABLE, details: 'Google API key is not configured.' },
        { status: 503 },
      );
    }

    let user;
    try {
      user = await getOrCreateUser(userId);
    } catch (error) {
      console.error('--- USER DB ERROR ---', error);
      return NextResponse.json(
        { error: UI.CHAT_UNAVAILABLE },
        { status: 503 },
      );
    }

    const isNewDay = user.lastChatDate.toDateString() !== new Date().toDateString();
    const chatCount = getEffectiveChatCount(user);

    if (!user.isSubscribed && chatCount >= FREE_DAILY_CHAT_LIMIT) {
      return NextResponse.json(
        { error: LIMIT_REACHED_MESSAGE },
        { status: 403 },
      );
    }

    const { messages, personaId, isPrivate, chatId: sessionChatId } = await req.json();
    const userInput = getLatestUserInput(messages);
    const selectedPrompt =
      systemPrompts[personaId as keyof typeof systemPrompts] || systemPrompts.mentor;

    const analysis = sentiment.analyze(userInput);
    const sentimentLabel =
      analysis.score > 0 ? 'positive' : analysis.score < 0 ? 'negative' : 'neutral';
    const { moodLabel, moodValue } = sentimentToMood(analysis.score);
    const chatId =
      sessionChatId ?? getLatestUserMessageId(messages) ?? generateId();

    const latestUserMessage = getLatestPersistableUserMessage(messages);

    if (latestUserMessage) {
      const title =
        latestUserMessage.text.split('\n')[0].slice(0, 80) || UI.NEW_ENTRY;

      const chatSaved = await ensureChatForUser({
        chatId,
        userId,
        title,
      });

      if (!chatSaved.ok) {
        console.error('--- USER CHAT SAVE ERROR ---', chatSaved.error);
        return NextResponse.json(
          { error: UI.HISTORY_SAVE_UNAVAILABLE, details: chatSaved.error },
          { status: 503 },
        );
      }

      const messageSaved = await saveChatMessage({
        id: latestUserMessage.id,
        chatId,
        role: 'user',
        content: latestUserMessage.text,
      });

      if (!messageSaved.ok) {
        console.error('--- USER MESSAGE SAVE ERROR ---', messageSaved.error);
        return NextResponse.json(
          { error: UI.HISTORY_SAVE_UNAVAILABLE, details: messageSaved.error },
          { status: 503 },
        );
      }

      await syncChatPreview(chatId, userId);
    }

    if (userInput.trim()) {
      try {
        await db.moodLog.create({
          data: {
            userId: user.id,
            moodLabel,
            moodValue,
            chatId,
          },
        });
      } catch (error) {
        console.error('--- MOOD LOG ERROR ---', error);
      }
    }

    let context = '';
    if (!isPrivate && index && userInput) {
      try {
        const results = await index.query({
          data: userInput,
          topK: 1,
          includeMetadata: true,
        });

        if (results.length > 0) {
          context = `User previously wrote: "${results[0].metadata?.text}"`;
        }
      } catch (error) {
        console.error('--- VECTOR QUERY ERROR ---', error);
      }
    }

    const systemPrompt = `${selectedPrompt}
Context: Sentiment score is ${analysis.score} (${sentimentLabel}). ${context}
Action: If context exists, gently reference the past entry — for example, "I remember you mentioned..." If sentiment is low, offer a 'Reflective Journey' prompt.`;

    const modelMessages = await convertToModelMessages(messages);
    let selectedModel: string | null = null;
    let lastModelError: unknown;

    for (const modelId of getGoogleChatModelIds()) {
      try {
        await generateText({
          model: googleProvider(modelId),
          system: systemPrompt,
          messages: modelMessages,
          maxOutputTokens: 1,
        });
        selectedModel = modelId;
        break;
      } catch (error) {
        lastModelError = error;
        console.error(`--- MODEL ${modelId} FAILED ---`, error);
      }
    }

    if (!selectedModel) {
      throw lastModelError ?? new Error('No Gemini models available');
    }

    const result = streamText({
      model: googleProvider(selectedModel),
      system: systemPrompt,
      messages: modelMessages,
      onFinish: async ({ text }) => {
        try {
          if (text.trim()) {
            const assistantSaved = await saveChatMessage({
              chatId,
              role: 'assistant',
              content: text,
            });

            if (!assistantSaved.ok) {
              console.error(
                '--- ASSISTANT MESSAGE SAVE ERROR ---',
                assistantSaved.error,
              );
            } else {
              await syncChatPreview(chatId, userId);
            }
          }

          await db.user.update({
            where: { id: user.id },
            data: {
              chatCount: isNewDay ? 1 : chatCount + 1,
              lastChatDate: new Date(),
            },
          });
        } catch (error) {
          console.error('--- CHAT FINISH ERROR ---', error);
        }
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error('--- CHAT STREAM ERROR ---', error);
        if (/not found|APICallError|API key|permission/i.test(message)) {
          return `AI model error: ${message.slice(0, 200)}`;
        }
        return UI.CHAT_UNAVAILABLE;
      },
    });
  } catch (error) {
    console.error('--- DETAILED API ERROR ---', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: UI.CHAT_UNAVAILABLE, details },
      { status: 500 },
    );
  }
}

import { google } from '@ai-sdk/google';
import { auth } from '@clerk/nextjs/server';
import { Index } from '@upstash/vector';
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { NextResponse } from 'next/server';
import Sentiment from 'sentiment';
import { db } from '@/lib/db';
import {
  FREE_DAILY_CHAT_LIMIT,
  getEffectiveChatCount,
  getOrCreateUser,
} from '@/lib/user';

const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MESSAGE =
  "You've been reflecting deeply! Take a breather and try again in an hour.";
const LIMIT_REACHED_MESSAGE =
  "You've reached your limit of 5 free chats today. Please check back in 24 hours or subscribe for unlimited access.";

const rateLimitStore = new Map<string, number[]>();
const sentiment = new Sentiment();

const index =
  process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN
    ? new Index({
        url: process.env.UPSTASH_VECTOR_REST_URL,
        token: process.env.UPSTASH_VECTOR_REST_TOKEN,
      })
    : null;

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
  - Constraint: If the user describes severe physical withdrawal or immediate crisis, gently urge them to seek medical or professional help.`
};

export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return new Response(RATE_LIMIT_MESSAGE, { status: 429 });
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await getOrCreateUser(userId);
    const isNewDay = user.lastChatDate.toDateString() !== new Date().toDateString();
    const chatCount = getEffectiveChatCount(user);

    if (!user.isSubscribed && chatCount >= FREE_DAILY_CHAT_LIMIT) {
      return NextResponse.json(
        { error: LIMIT_REACHED_MESSAGE },
        { status: 403 },
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        chatCount: isNewDay ? 1 : chatCount + 1,
        lastChatDate: new Date(),
      },
    });

    const { messages, personaId, isPrivate } = await req.json();
    const userInput = getLatestUserInput(messages);
    const selectedPrompt =
      systemPrompts[personaId as keyof typeof systemPrompts] || systemPrompts.mentor;

    const analysis = sentiment.analyze(userInput);
    const sentimentLabel =
      analysis.score > 0 ? 'positive' : analysis.score < 0 ? 'negative' : 'neutral';

    let context = '';
    if (!isPrivate && index && userInput) {
      const results = await index.query({
        data: userInput,
        topK: 1,
        includeMetadata: true,
      });

      if (results.length > 0) {
        context = `User previously wrote: "${results[0].metadata?.text}"`;
      }
    }

    const systemPrompt = `${selectedPrompt}
Context: Sentiment score is ${analysis.score} (${sentimentLabel}). ${context}
Action: If context exists, gently reference the past entry — for example, "I remember you mentioned..." If sentiment is low, offer a 'Reflective Journey' prompt.`;

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('--- DETAILED API ERROR ---', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

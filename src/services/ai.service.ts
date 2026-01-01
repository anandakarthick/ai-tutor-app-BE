import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import { cacheService } from '../config/redis';

const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

export interface TeachingContext {
  studentName: string;
  grade: string;
  subject: string;
  topic: string;
  content: string;
  learningStyle?: string;
  previousContext?: string;
}

export interface DoubtContext {
  studentName: string;
  grade: string;
  subject: string;
  topic?: string;
  question: string;
  imageDescription?: string;
}

export interface QuizGenerationContext {
  topic: string;
  content: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  questionTypes: string[];
}

export class AIService {
  private model = 'claude-3-5-sonnet-20241022';

  /**
   * Conduct an AI teaching session
   */
  async conductTeachingSession(context: TeachingContext): Promise<string> {
    const systemPrompt = `You are an expert tutor for ${context.grade} students, teaching ${context.subject}. 
Your teaching style should be:
- Use simple, age-appropriate language
- Give relatable examples from daily life
- Break complex concepts into smaller, digestible parts
- Use analogies and visual descriptions
- Check understanding periodically with questions
- Be encouraging and patient
- Offer alternative explanations if the student seems confused
- Include memory tricks and mnemonics when helpful

Student's name: ${context.studentName}
${context.learningStyle ? `Learning style preference: ${context.learningStyle}` : ''}`;

    try {
      const message = await anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please teach me about "${context.topic}". Here's the content to cover:\n\n${context.content}${context.previousContext ? `\n\nPrevious conversation context:\n${context.previousContext}` : ''}`,
          },
        ],
      });

      const textContent = message.content.find(block => block.type === 'text');
      return textContent ? textContent.text : 'I apologize, but I could not generate a response.';
    } catch (error) {
      logger.error('AI Teaching Session Error:', error);
      throw error;
    }
  }

  /**
   * Resolve student doubt
   */
  async resolveDoubt(context: DoubtContext): Promise<string> {
    const systemPrompt = `You are a helpful tutor assistant for ${context.grade} students.
Your role is to answer doubts clearly and patiently.

Guidelines:
- Answer in simple, easy-to-understand language
- Provide step-by-step explanations when needed
- Use examples to illustrate concepts
- If the question is unclear, ask for clarification
- Always encourage the student

Student: ${context.studentName}
Subject: ${context.subject}
${context.topic ? `Topic: ${context.topic}` : ''}`;

    try {
      const userContent = context.imageDescription
        ? `${context.question}\n\n[Image description: ${context.imageDescription}]`
        : context.question;

      const message = await anthropic.messages.create({
        model: this.model,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      });

      const textContent = message.content.find(block => block.type === 'text');
      return textContent ? textContent.text : 'I apologize, but I could not generate a response.';
    } catch (error) {
      logger.error('AI Doubt Resolution Error:', error);
      throw error;
    }
  }

  /**
   * Generate quiz questions
   */
  async generateQuizQuestions(context: QuizGenerationContext): Promise<any[]> {
    const systemPrompt = `You are a quiz generator for educational content.
Generate ${context.questionCount} questions based on the given content.

Difficulty: ${context.difficulty}
Question types to include: ${context.questionTypes.join(', ')}

Return the questions in the following JSON format:
{
  "questions": [
    {
      "type": "mcq",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Why this is correct",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

    try {
      const message = await anthropic.messages.create({
        model: this.model,
        max_tokens: 3000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Topic: ${context.topic}\n\nContent:\n${context.content}\n\nGenerate ${context.questionCount} ${context.difficulty} questions.`,
          },
        ],
      });

      const textContent = message.content.find(block => block.type === 'text');
      if (!textContent) return [];

      // Parse JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.questions || [];
      }

      return [];
    } catch (error) {
      logger.error('AI Quiz Generation Error:', error);
      throw error;
    }
  }

  /**
   * Generate personalized study plan
   */
  async generateStudyPlan(context: {
    studentName: string;
    grade: string;
    subjects: string[];
    dailyHours: number;
    targetExam?: string;
    weakAreas?: string[];
    durationWeeks: number;
  }): Promise<any> {
    const systemPrompt = `You are an educational planner creating personalized study schedules.
Create a detailed study plan based on the student's needs.

Return the plan in JSON format:
{
  "title": "Study Plan Title",
  "description": "Brief description",
  "weeklySchedule": [
    {
      "week": 1,
      "focus": "Main focus for the week",
      "dailyPlans": [
        {
          "day": "Monday",
          "subjects": [
            {
              "subject": "Math",
              "topics": ["Topic 1", "Topic 2"],
              "duration": 60,
              "activities": ["Practice problems", "Watch video"]
            }
          ]
        }
      ]
    }
  ],
  "tips": ["Tip 1", "Tip 2"]
}`;

    try {
      const message = await anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Create a ${context.durationWeeks}-week study plan for ${context.studentName} (Grade ${context.grade}).
Subjects: ${context.subjects.join(', ')}
Daily study hours: ${context.dailyHours}
${context.targetExam ? `Target exam: ${context.targetExam}` : ''}
${context.weakAreas ? `Weak areas to focus on: ${context.weakAreas.join(', ')}` : ''}`,
          },
        ],
      });

      const textContent = message.content.find(block => block.type === 'text');
      if (!textContent) return null;

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    } catch (error) {
      logger.error('AI Study Plan Generation Error:', error);
      throw error;
    }
  }

  /**
   * Analyze student progress and provide insights
   */
  async analyzeProgress(context: {
    studentName: string;
    subjects: { name: string; progress: number; quizScores: number[] }[];
    streakDays: number;
    totalStudyHours: number;
  }): Promise<string> {
    const systemPrompt = `You are an educational analyst providing insights on student performance.
Analyze the data and provide:
1. Overall performance summary
2. Strengths and areas for improvement
3. Personalized recommendations
4. Motivational message

Keep the tone encouraging and constructive.`;

    try {
      const message = await anthropic.messages.create({
        model: this.model,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Analyze the progress for ${context.studentName}:

Subjects:
${context.subjects.map(s => `- ${s.name}: ${s.progress}% complete, Quiz scores: ${s.quizScores.join(', ')}`).join('\n')}

Current streak: ${context.streakDays} days
Total study hours: ${context.totalStudyHours}

Provide a detailed analysis and recommendations.`,
          },
        ],
      });

      const textContent = message.content.find(block => block.type === 'text');
      return textContent ? textContent.text : 'Unable to generate analysis.';
    } catch (error) {
      logger.error('AI Progress Analysis Error:', error);
      throw error;
    }
  }

  /**
   * Generate revision summary
   */
  async generateSummary(context: {
    topic: string;
    content: string;
    format: 'bullets' | 'flashcards' | 'mindmap';
  }): Promise<string> {
    const formatInstructions = {
      bullets: 'Create a bullet-point summary with key concepts',
      flashcards: 'Create Q&A flashcard pairs for revision',
      mindmap: 'Create a text-based mind map structure',
    };

    try {
      const message = await anthropic.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Topic: ${context.topic}

Content to summarize:
${context.content}

${formatInstructions[context.format]}`,
          },
        ],
      });

      const textContent = message.content.find(block => block.type === 'text');
      return textContent ? textContent.text : 'Unable to generate summary.';
    } catch (error) {
      logger.error('AI Summary Generation Error:', error);
      throw error;
    }
  }

  /**
   * Chat continuation for learning sessions
   */
  async continueChat(
    sessionId: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    systemContext: string
  ): Promise<string> {
    try {
      const message = await anthropic.messages.create({
        model: this.model,
        max_tokens: 1500,
        system: systemContext,
        messages: messages as any[],
      });

      const textContent = message.content.find(block => block.type === 'text');
      return textContent ? textContent.text : 'Unable to generate response.';
    } catch (error) {
      logger.error('AI Chat Continuation Error:', error);
      throw error;
    }
  }
}

export default new AIService();

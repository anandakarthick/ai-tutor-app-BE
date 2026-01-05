/**
 * Speech Service - Text-to-Speech and Speech-to-Text
 */

import { logger } from '../utils/logger';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class SpeechService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads/audio');
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Convert text to speech using Google TTS (free)
   * Returns base64 encoded audio
   */
  async textToSpeech(text: string, language: string = 'en-IN'): Promise<string> {
    try {
      // Clean text for speech
      const cleanText = text
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!cleanText) {
        return '';
      }

      // Use Google Translate TTS (free, no API key needed)
      const encodedText = encodeURIComponent(cleanText.substring(0, 200)); // Limit length
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${language}&client=tw-ob`;

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const base64Audio = Buffer.from(response.data).toString('base64');
      return base64Audio;
    } catch (error) {
      logger.error('Text-to-Speech error:', error);
      return '';
    }
  }

  /**
   * Convert long text to speech in chunks
   * Returns array of base64 encoded audio chunks
   */
  async textToSpeechChunks(text: string, language: string = 'en-IN'): Promise<string[]> {
    try {
      // Split text into sentences
      const sentences = text
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0);

      const audioChunks: string[] = [];

      for (const sentence of sentences) {
        if (sentence.trim().length > 0) {
          const audio = await this.textToSpeech(sentence, language);
          if (audio) {
            audioChunks.push(audio);
          }
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return audioChunks;
    } catch (error) {
      logger.error('Text-to-Speech chunks error:', error);
      return [];
    }
  }

  /**
   * Simple speech recognition simulation
   * In production, you would use Google Speech-to-Text, Whisper, or similar
   */
  async speechToText(audioBase64: string, language: string = 'en-IN'): Promise<string> {
    try {
      // For now, return a placeholder
      // In production, integrate with:
      // - Google Cloud Speech-to-Text
      // - OpenAI Whisper
      // - Azure Speech Services
      // - AWS Transcribe
      
      logger.info('Speech-to-Text called - implement with actual service');
      
      // Placeholder response
      return '';
    } catch (error) {
      logger.error('Speech-to-Text error:', error);
      return '';
    }
  }

  /**
   * Save audio file from base64
   */
  async saveAudioFile(audioBase64: string, format: string = 'mp3'): Promise<string> {
    try {
      const filename = `${uuidv4()}.${format}`;
      const filepath = path.join(this.uploadsDir, filename);
      
      const buffer = Buffer.from(audioBase64, 'base64');
      fs.writeFileSync(filepath, buffer);
      
      return filename;
    } catch (error) {
      logger.error('Save audio file error:', error);
      return '';
    }
  }
}

export default new SpeechService();

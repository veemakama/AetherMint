import Joi from 'joi';
import { ValidationSchema } from '../validate';

const tagsQuerySchema = Joi.alternatives()
  .try(Joi.string(), Joi.array().items(Joi.string()))
  .custom(value => (Array.isArray(value) ? value.join(',') : value), 'normalize tags query');

export const createQuizSchema: ValidationSchema = {
  body: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    courseId: Joi.string().uuid().required(),
    timeLimit: Joi.number().integer().min(1).max(300).optional(),
    passingScore: Joi.number().min(0).max(100).optional(),
    maxAttempts: Joi.number().integer().min(1).max(10).optional(),
    shuffleQuestions: Joi.boolean().default(false),
    showAnswers: Joi.boolean().default(false),
    isPublished: Joi.boolean().default(false),
    questions: Joi.array().items(
      Joi.object({
        text: Joi.string().min(1).max(2000).required(),
        type: Joi.string().valid('multiple_choice', 'true_false', 'short_answer', 'essay').required(),
        points: Joi.number().min(0).max(100).required(),
        options: Joi.array().items(Joi.string()).optional(),
        correctAnswer: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
      })
    ).min(1).required(),
  }),
};

export const updateQuizSchema: ValidationSchema = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    timeLimit: Joi.number().integer().min(1).max(300).optional(),
    passingScore: Joi.number().min(0).max(100).optional(),
    maxAttempts: Joi.number().integer().min(1).max(10).optional(),
    shuffleQuestions: Joi.boolean().optional(),
    showAnswers: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
  }),
};

export const quizIdParamSchema: ValidationSchema = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
};

export const submitQuizSchema: ValidationSchema = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    answers: Joi.array().items(
      Joi.object({
        questionId: Joi.string().uuid().required(),
        answer: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required(),
      })
    ).min(1).required(),
    timeSpent: Joi.number().integer().min(0).required(),
  }),
};

export const getQuizzesQuerySchema: ValidationSchema = {
  query: Joi.object({
    courseId: Joi.string().uuid().optional(),
    instructorId: Joi.string().uuid().optional(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    isPublished: Joi.string().valid('true', 'false').optional(),
    tags: tagsQuerySchema.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const submissionQuerySchema: ValidationSchema = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  query: Joi.object({
    userId: Joi.string().uuid().optional(),
  }),
};

export const resultsQuerySchema: ValidationSchema = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  query: Joi.object({
    userId: Joi.string().uuid().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

export const submissionIdParamSchema: ValidationSchema = {
  params: Joi.object({ submissionId: Joi.string().uuid().required() }),
};

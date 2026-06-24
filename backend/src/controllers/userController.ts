import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import logger from '../utils/logger';
import { NotFoundError } from '../utils/errors';

export const userController = {
  getProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;
      const profile = await userService.getProfile(address);

      if (!profile) throw new NotFoundError('Profile not found');

      res.json(profile);
    } catch (error) {
      logger.error('Error in getProfile controller', error);
      next(error);
    }
  },

  updateProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;
      const updateData = req.body;

      const updatedProfile = await userService.updateProfile(address, updateData);
      res.json(updatedProfile);
    } catch (error) {
      logger.error('Error in updateProfile controller', error);
      next(error);
    }
  },

  getSettings: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const settings = await userService.getSettings(userId);
      res.json(settings);
    } catch (error) {
      logger.error('Error in getSettings controller', error);
      next(error);
    }
  },

  updateSettings: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const settingsData = req.body;

      const updatedSettings = await userService.updateSettings(userId, settingsData);
      res.json(updatedSettings);
    } catch (error) {
      logger.error('Error in updateSettings controller', error);
      next(error);
    }
  },

  getAchievements: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;
      const achievements = await userService.getAchievements(address);
      res.json(achievements);
    } catch (error) {
      logger.error('Error in getAchievements controller', error);
      next(error);
    }
  },

  getStats: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;
      const stats = await userService.getProfileStats(address);
      res.json(stats);
    } catch (error) {
      logger.error('Error in getStats controller', error);
      next(error);
    }
  }
};

export enum UserRole {
  STUDENT = 'student',
  EDUCATOR = 'educator',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  profile?: UserProfile;
  address?: string;
}

export enum PrivacyLevel {
  Public = 'Public',
  Private = 'Private',
  FriendsOnly = 'FriendsOnly',
}

export interface UserProfile {
  owner: string;
  username: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
  achievements: number[];
  credentials: number[];
  reputation: number;
  privacyLevel: PrivacyLevel;
  role: UserRole;
}

export interface Achievement {
  id: number;
  user: string;
  title: string;
  description: string;
  earnedAt: number;
  badgeUrl?: string;
  verified: boolean;
}

export interface UserStats {
  totalCourses: number;
  totalCredentials: number;
  totalAchievements: number;
  reputation: number;
}
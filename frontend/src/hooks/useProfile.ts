import { useState, useEffect, useCallback } from 'react';
import { 
  UserProfile, 
  Achievement, 
  Credential, 
  ProfileStats, 
  ProfileSettings,
  ProfileFormData,
  ProfileUpdateResponse,
  AchievementProgress
} from '../types/profile';

const MOCK_USER: UserProfile = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: '',
  bio: 'Passionate learner and technology enthusiast',
  location: 'San Francisco, CA',
  website: 'https://johndoe.dev',
  joinDate: '2023-01-15',
  totalCoursesCompleted: 12,
  currentStreak: 7,
  studyHours: 156,
  level: 5,
  experience: 2450,
  privacy: 'public'
};

const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: '1',
    name: 'First Steps',
    description: 'Complete your first course',
    icon: '🎯',
    earnedDate: '2023-01-20',
    rarity: 'common',
    requirement: 'Complete any course',
    category: 'milestone',
    progress: 1,
    maxProgress: 1
  },
  {
    id: '2',
    name: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    icon: '🔥',
    earnedDate: '2023-02-01',
    rarity: 'rare',
    requirement: 'Study for 7 consecutive days',
    category: 'streak',
    progress: 7,
    maxProgress: 7
  },
  {
    id: '3',
    name: 'Knowledge Seeker',
    description: 'Complete 10 courses',
    icon: '📚',
    earnedDate: '2023-03-15',
    rarity: 'epic',
    requirement: 'Complete 10 courses',
    category: 'learning',
    progress: 12,
    maxProgress: 10
  },
  {
    id: '4',
    name: 'Master Mind',
    description: 'Achieve level 10',
    icon: '🧠',
    rarity: 'legendary',
    requirement: 'Reach level 10',
    category: 'level',
    progress: 5,
    maxProgress: 10
  }
];

const MOCK_CREDENTIALS: Credential[] = [
  {
    id: '1',
    title: 'React Development Certificate',
    issuer: 'AetherMint Academy',
    issueDate: '2023-02-15',
    credentialId: 'SE-REACT-2023-001',
    type: 'certificate',
    verificationStatus: 'verified',
    verificationUrl: 'https://verify.aethermint.com/SE-REACT-2023-001',
    skills: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS']
  },
  {
    id: '2',
    title: 'Blockchain Fundamentals',
    issuer: 'AetherMint Academy',
    issueDate: '2023-03-20',
    credentialId: 'SE-BC-2023-002',
    type: 'badge',
    verificationStatus: 'pending',
    skills: ['Blockchain', 'Cryptography', 'Smart Contracts']
  },
  {
    id: '3',
    title: 'Advanced TypeScript',
    issuer: 'Tech Institute',
    issueDate: '2023-01-10',
    expiryDate: '2024-01-10',
    credentialId: 'TI-TS-2023-001',
    type: 'license',
    verificationStatus: 'verified',
    verificationUrl: 'https://verify.techinstitute.com/TI-TS-2023-001',
    skills: ['TypeScript', 'JavaScript', 'Node.js']
  }
];

const MOCK_STATS: ProfileStats = {
  totalCourses: 15,
  completedCourses: 12,
  inProgressCourses: 3,
  totalCertificates: 8,
  verifiedCredentials: 2,
  pendingCredentials: 1,
  totalAchievements: 4,
  rareAchievements: 1,
  studyStreak: 7,
  totalStudyHours: 156,
  averageCompletionTime: 14,
  rank: 42,
  percentile: 78
};

const MOCK_SETTINGS: ProfileSettings = {
  emailNotifications: true,
  weeklyDigest: true,
  achievementAlerts: true,
  darkMode: false,
  language: 'en',
  privacy: 'public',
  twoFactorEnabled: false,
  newsletter: true,
  profileVisibility: {
    showAchievements: true,
    showCourses: true,
    showStats: true,
    showCredentials: true
  }
};

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile data
  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Load from localStorage or use mock data
      const savedProfile = localStorage.getItem('userProfile');
      const savedAchievements = localStorage.getItem('userAchievements');
      const savedCredentials = localStorage.getItem('userCredentials');
      const savedStats = localStorage.getItem('userStats');
      const savedSettings = localStorage.getItem('userSettings');

      setProfile(savedProfile ? JSON.parse(savedProfile) : MOCK_USER);
      setAchievements(savedAchievements ? JSON.parse(savedAchievements) : MOCK_ACHIEVEMENTS);
      setCredentials(savedCredentials ? JSON.parse(savedCredentials) : MOCK_CREDENTIALS);
      setStats(savedStats ? JSON.parse(savedStats) : MOCK_STATS);
      setSettings(savedSettings ? JSON.parse(savedSettings) : MOCK_SETTINGS);
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Error loading profile data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (formData: ProfileFormData): Promise<ProfileUpdateResponse> => {
    setLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedProfile: UserProfile = {
        ...(profile || MOCK_USER),
        ...formData
      };

      setProfile(updatedProfile);
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));

      return {
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile
      };
    } catch (err) {
      const errorMessage = 'Failed to update profile';
      setError(errorMessage);
      console.error('Error updating profile:', err);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Update achievements
  const updateAchievements = useCallback(async (newAchievements: Achievement[]) => {
    setAchievements(newAchievements);
    localStorage.setItem('userAchievements', JSON.stringify(newAchievements));
  }, []);

  // Update credentials
  const updateCredentials = useCallback(async (newCredentials: Credential[]) => {
    setCredentials(newCredentials);
    localStorage.setItem('userCredentials', JSON.stringify(newCredentials));
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings: ProfileSettings) => {
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
  }, []);

  // Add new credential
  const addCredential = useCallback(async (credential: Omit<Credential, 'id'>): Promise<Credential> => {
    const newCredential: Credential = {
      ...credential,
      id: Date.now().toString()
    };

    const updatedCredentials = [...credentials, newCredential];
    await updateCredentials(updatedCredentials);

    return newCredential;
  }, [credentials, updateCredentials]);

  // Update credential verification status
  const updateCredentialStatus = useCallback(async (credentialId: string, status: Credential['verificationStatus']) => {
    const updatedCredentials = credentials.map(cred => 
      cred.id === credentialId ? { ...cred, verificationStatus: status } : cred
    );
    await updateCredentials(updatedCredentials);
  }, [credentials, updateCredentials]);

  // Update achievement progress
  const updateAchievementProgress = useCallback(async (achievementId: string, progress: AchievementProgress) => {
    const updatedAchievements = achievements.map(achievement => 
      achievement.id === achievementId 
        ? { 
            ...achievement, 
            progress: progress.currentProgress,
            earnedDate: progress.isCompleted ? new Date().toISOString() : achievement.earnedDate
          }
        : achievement
    );
    await updateAchievements(updatedAchievements);
  }, [achievements, updateAchievements]);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    try {
      const newStats: ProfileStats = {
        ...MOCK_STATS,
        completedCourses: achievements.filter(a => a.earnedDate && a.category === 'learning').length,
        verifiedCredentials: credentials.filter(c => c.verificationStatus === 'verified').length,
        pendingCredentials: credentials.filter(c => c.verificationStatus === 'pending').length,
        totalAchievements: achievements.filter(a => a.earnedDate).length,
        rareAchievements: achievements.filter(a => a.earnedDate && ['epic', 'legendary'].includes(a.rarity)).length
      };

      setStats(newStats);
      localStorage.setItem('userStats', JSON.stringify(newStats));
    } catch (error) {
      console.error('Error refreshing stats:', error);
      setError('Failed to refresh statistics');
    }
  }, [achievements, credentials]);

  // Initialize data on mount
  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Refresh stats when achievements or credentials change
  useEffect(() => {
    if (achievements.length > 0 || credentials.length > 0) {
      refreshStats();
    }
  }, [achievements, credentials, refreshStats]);

  return {
    profile,
    achievements,
    credentials,
    stats,
    settings,
    loading,
    error,
    updateProfile,
    updateAchievements,
    updateCredentials,
    updateSettings,
    addCredential,
    updateCredentialStatus,
    updateAchievementProgress,
    refreshStats,
    reloadProfile: loadProfileData
  };
};

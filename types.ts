
export enum MangaStatus {
  READING = 'READING',
  PLAN_TO_READ = 'PLAN_TO_READ',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED'
}

export interface User {
  id: string;
  username: string;
  email: string;
  token?: string;
}

export interface MangaTitle {
  id: string;
  title: string; 
  titles: {
    english?: string;
    romaji?: string;
    native?: string;
    russian?: string;
  };
  description: string;
  coverImage: string;
  totalChapters: number;
  currentChapter: number;
  status: MangaStatus;
  rating: number | string;
  userScore?: number;
  userReview?: string;
  lastUpdated: string;
  isAdult?: boolean;
}

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  codeSnippet?: string;
  language?: string;
  sqlSchema?: string;
  apiEndpoints?: string[];
}

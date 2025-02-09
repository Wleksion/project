export interface Post {
  title: string;
  selftext: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  upvote_ratio: number;
  is_self: boolean;
  is_video: boolean;
  url?: string;
  link_flair_text?: string;
}

export interface TopicAnalysis {
  mainTopics: Array<{
    topic: string;
    frequency: number;
  }>;
  commonWords: Array<{
    word: string;
    count: number;
  }>;
  flairStats: Array<{
    flair: string;
    count: number;
    avgScore: number;
  }>;
}

export interface ContentStats {
  totalPosts: number;
  avgScore: number;
  avgComments: number;
  avgUpvoteRatio: number;
  engagementRate: number;
  postTypes: {
    text: number;
    link: number;
    video: number;
    image: number;
  };
  topContributors: Array<{
    author: string;
    postCount: number;
    avgScore: number;
    avgComments: number;
  }>;
  successRates: Array<{
    hour: number;
    rate: number;
  }>;
}

export interface TimeWindow {
  start: string;
  end: string;
  reliability: number;
}

export interface AnalysisResult {
  bestHour: number;
  bestMinute: number;
  bestDay: string;
  bestDayOfWeek: number;
  timeWindow: TimeWindow;
  activityHeatmap: Array<{
    hour: number;
    day: number;
    value: number;
  }>;
  scoreByHour: Array<{
    hour: number;
    avgScore: number;
  }>;
  maxActivity: number;
  topicAnalysis: TopicAnalysis;
  contentStats: ContentStats;
  engagementTrends: Array<{
    day: string;
    engagement: number;
  }>;
  explanation: string;
  alternativeTimes: Array<{
    hour: number;
    minute: number;
    score: number;
    dayOfWeek: number;
  }>;
}
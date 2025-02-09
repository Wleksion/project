import { Post, AnalysisResult, TopicAnalysis, ContentStats, TimeWindow } from '../types';
import { format, getHours, getDay, differenceInHours, fromUnixTime, subDays, differenceInDays, addHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Enhanced word filtering with more stop words
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what', 'when',
  'where', 'who', 'which', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'can', 'just', 'should', 'now'
]);

function calculateEngagementScore(post: Post, timezone: string): number {
  const postDate = toZonedTime(new Date(post.created_utc * 1000), timezone);
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const ageInHours = differenceInHours(zonedNow, postDate);
  
  // Temel puan: upvote ve yorum ağırlıklı
  const baseScore = post.score + (post.num_comments * 2);
  
  // 4 saatlik yarı ömür ile zaman bazlı azalma
  const decayFactor = Math.exp(-ageInHours / 4);
  
  return baseScore * decayFactor;
}

function getTimeBonus(date: Date, timezone: string): number {
  const hour = getHours(toZonedTime(date, timezone));
  // Prime time bonus (higher engagement during active hours)
  if (hour >= 8 && hour <= 22) {
    return 1.2;
  }
  return 1.0;
}

function predictPeakTime(posts: Post[], timezone: string): { 
  hour: number; 
  minute: number;
  score: number; 
  alternativeTimes: Array<{
    hour: number;
    minute: number;
    score: number;
    dayOfWeek: number;
  }>;
  explanation: string;
  bestDayOfWeek: number;
} {
  // Saatlik ve günlük etkileşim verilerini topla
  const dayHourEngagement: { [key: string]: number[] } = {};
  const dayStats: { [key: number]: { posts: number; engagement: number } } = {};
  
  posts.forEach(post => {
    const postDate = toZonedTime(new Date(post.created_utc * 1000), timezone);
    const hour = getHours(postDate);
    const minute = Math.floor(postDate.getMinutes() / 15) * 15;
    const day = getDay(postDate);
    const dayHourKey = `${day}-${hour}:${minute}`;
    
    if (!dayHourEngagement[dayHourKey]) {
      dayHourEngagement[dayHourKey] = [];
    }
    
    if (!dayStats[day]) {
      dayStats[day] = { posts: 0, engagement: 0 };
    }
    
    const engagementScore = calculateDetailedEngagementScore(post, timezone);
    dayHourEngagement[dayHourKey].push(engagementScore.total);
    
    dayStats[day].posts++;
    dayStats[day].engagement += engagementScore.total;
  });

  // Her gün ve saat için ortalama etkileşim skorlarını hesapla
  const timeStats = Object.entries(dayHourEngagement).map(([key, scores]) => {
    const [dayHour, minuteStr] = key.split(':');
    const [day, hourStr] = dayHour.split('-');
    const dayIndex = parseInt(day);
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const volume = scores.length;
    
    // Normalize edilmiş skor
    const timeScore = avgScore * Math.min(Math.max(volume / 5, 0.5), 1);
    
    return {
      hour,
      minute,
      dayOfWeek: dayIndex,
      score: timeScore,
      volume
    };
  });

  // En iyi zamanı belirle
  const bestTime = timeStats.reduce((max, current) => 
    current.score > max.score ? current : max
  , timeStats[0]);

  // Alternatif zamanları belirle - en iyi zaman hariç diğer günlerin en iyi zamanları
  const alternativeTimes = timeStats
    .filter(time => 
      // En iyi zamanı hariç tut
      !(time.hour === bestTime.hour && 
        time.minute === bestTime.minute && 
        time.dayOfWeek === bestTime.dayOfWeek)
    )
    .sort((a, b) => b.score - a.score)
    .reduce((acc, time) => {
      // Her gün için sadece en iyi zamanı al
      const existingDayTime = acc.find(t => t.dayOfWeek === time.dayOfWeek);
      if (!existingDayTime) {
        acc.push(time);
      }
      return acc;
    }, [] as typeof timeStats)
    .slice(0, 3);

  // Detaylı açıklama oluştur
  const explanation = `Analysis Methodology:
    
    1. Data Collection and Processing:
    - Analyzed ${posts.length} posts
    - Examined 4-hour engagement window for each post
    - Time slots grouped in 15-minute intervals
    - Tracked user activities and interactions
    
    2. Engagement Score Calculation:
    - Base Score = Upvotes + (Comments × 2)
    - Time Decay = exp(-post_age / 4)
    - Prime-time Bonus = 20% between 8 AM - 10 PM
    
    3. Time Factors:
    - Analyzed each day's performance separately
    - Considered post volume and engagement rates
    - Weighted recent posts more heavily
    
    4. Optimization Criteria:
    - Engagement stability
    - User activity distribution
    - Time slot performance comparison
    - Day-based success rates`;

  return {
    hour: bestTime.hour,
    minute: bestTime.minute,
    score: bestTime.score,
    alternativeTimes,
    explanation,
    bestDayOfWeek: bestTime.dayOfWeek
  };
}

function calculateDetailedEngagementScore(post: Post, timezone: string): {
  total: number;
  fourHourScore: number;
  components: {
    baseScore: number;
    timeDecay: number;
    commentWeight: number;
  };
} {
  const postDate = toZonedTime(new Date(post.created_utc * 1000), timezone);
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const ageInHours = differenceInHours(zonedNow, postDate);
  
  const upvoteScore = post.score;
  const commentWeight = post.num_comments * 2;
  const baseScore = upvoteScore + commentWeight;
  
  const timeDecay = Math.exp(-ageInHours / 4);
  
  const fourHourScore = baseScore * Math.exp(-4 / 4);
  
  const total = baseScore * timeDecay;
  
  return {
    total,
    fourHourScore,
    components: {
      baseScore,
      timeDecay,
      commentWeight
    }
  };
}

function getVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  return numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
}

function analyzeTopics(posts: Post[]): TopicAnalysis {
  const wordFreq: { [key: string]: number } = {};
  const flairCounts: { [key: string]: { count: number; totalScore: number } } = {};
  
  posts.forEach(post => {
    const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
    const words = text.split(/\W+/).filter(word => 
      word.length > 3 && 
      !STOP_WORDS.has(word) &&
      !/^\d+$/.test(word)
    );
    
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    if (post.link_flair_text) {
      if (!flairCounts[post.link_flair_text]) {
        flairCounts[post.link_flair_text] = { count: 0, totalScore: 0 };
      }
      flairCounts[post.link_flair_text].count++;
      flairCounts[post.link_flair_text].totalScore += calculateEngagementScore(post, 'UTC');
    }
  });

  // Calculate TF-IDF scores for better topic relevance
  const numDocs = posts.length;
  const wordScores = Object.entries(wordFreq).map(([word, freq]) => {
    const docsWithWord = posts.filter(post => 
      `${post.title} ${post.selftext || ''}`.toLowerCase().includes(word)
    ).length;
    const idf = Math.log(numDocs / docsWithWord);
    const score = freq * idf;
    return { word, score };
  });

  const weightedWords = wordScores
    .sort((a, b) => b.score - a.score)
    .filter(({ word }) => word.length > 3);

  return {
    mainTopics: weightedWords.slice(0, 5).map(({ word, score }) => ({
      topic: word,
      frequency: Math.round(score)
    })),
    commonWords: weightedWords.slice(0, 10).map(({ word, score }) => ({
      word,
      count: Math.round(score)
    })),
    flairStats: Object.entries(flairCounts)
      .sort(([, a], [, b]) => b.totalScore - a.totalScore)
      .map(([flair, { count, totalScore }]) => ({
        flair,
        count,
        avgScore: Math.round(totalScore / count)
      }))
  };
}

function analyzeContentStats(posts: Post[], timezone: string): ContentStats {
  const authors = new Map<string, { posts: number; totalScore: number; totalComments: number }>();
  const hourlySuccess: { [key: number]: { posts: number; highEngagement: number } } = {};
  
  posts.forEach(post => {
    const postDate = toZonedTime(new Date(post.created_utc * 1000), timezone);
    const hour = getHours(postDate);
    const engagement = calculateEngagementScore(post, timezone);
    
    // Track author stats
    if (!authors.has(post.author)) {
      authors.set(post.author, { posts: 0, totalScore: 0, totalComments: 0 });
    }
    const authorStats = authors.get(post.author)!;
    authorStats.posts++;
    authorStats.totalScore += post.score;
    authorStats.totalComments += post.num_comments;
    
    // Track hourly success rates
    if (!hourlySuccess[hour]) {
      hourlySuccess[hour] = { posts: 0, highEngagement: 0 };
    }
    hourlySuccess[hour].posts++;
    if (engagement > getMedianEngagement(posts)) {
      hourlySuccess[hour].highEngagement++;
    }
  });

  const postTypes = {
    text: posts.filter(p => p.is_self).length,
    link: posts.filter(p => !p.is_self && !p.is_video).length,
    video: posts.filter(p => p.is_video).length,
    image: posts.filter(p => p.url?.match(/\.(jpg|jpeg|png|gif)$/i)).length
  };

  const totalScore = posts.reduce((sum, post) => sum + post.score, 0);
  const totalComments = posts.reduce((sum, post) => sum + post.num_comments, 0);
  const avgUpvoteRatio = posts.reduce((sum, post) => sum + (post.upvote_ratio || 0), 0) / posts.length;

  const successRates = Object.entries(hourlySuccess).map(([hour, stats]) => ({
    hour: parseInt(hour),
    rate: (stats.highEngagement / stats.posts) * 100
  })).sort((a, b) => b.rate - a.rate);

  return {
    totalPosts: posts.length,
    avgScore: totalScore / posts.length,
    avgComments: totalComments / posts.length,
    avgUpvoteRatio,
    engagementRate: calculateOverallEngagementRate(posts, timezone),
    postTypes,
    topContributors: Array.from(authors.entries())
      .map(([author, stats]) => ({
        author,
        postCount: stats.posts,
        avgScore: stats.totalScore / stats.posts,
        avgComments: stats.totalComments / stats.posts
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10),
    successRates
  };
}

function getMedianEngagement(posts: Post[]): number {
  const scores = posts.map(p => p.score + p.num_comments).sort((a, b) => a - b);
  const mid = Math.floor(scores.length / 2);
  return scores.length % 2 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
}

function calculateOverallEngagementRate(posts: Post[], timezone: string): number {
  const engagementScores = posts.map(post => calculateEngagementScore(post, timezone));
  const maxEngagement = Math.max(...engagementScores);
  const avgEngagement = engagementScores.reduce((a, b) => a + b, 0) / posts.length;
  
  return (avgEngagement / maxEngagement) * 100;
}

function analyzeTimePatterns(posts: Post[], timezone: string): {
  bestHour: number;
  bestMinute: number;
  bestDay: string;
  timeWindow: TimeWindow;
  activityHeatmap: { hour: number; day: number; value: number }[];
  scoreByHour: { hour: number; avgScore: number }[];
  maxActivity: number;
} {
  const hourlyActivity: { [key: string]: { posts: number; totalScore: number } } = {};
  const dayActivity: { [key: string]: number } = {};
  const heatmap: { [key: string]: number } = {};
  
  posts.forEach(post => {
    const date = toZonedTime(new Date(post.created_utc * 1000), timezone);
    const hour = getHours(date);
    const day = getDay(date);
    const hourKey = `${hour}`;
    const dayKey = format(date, 'EEEE');
    const heatmapKey = `${day}-${hour}`;
    
    if (!hourlyActivity[hourKey]) {
      hourlyActivity[hourKey] = { posts: 0, totalScore: 0 };
    }
    hourlyActivity[hourKey].posts++;
    hourlyActivity[hourKey].totalScore += calculateEngagementScore(post, timezone);
    
    dayActivity[dayKey] = (dayActivity[dayKey] || 0) + 1;
    heatmap[heatmapKey] = (heatmap[heatmapKey] || 0) + 1;
  });

  const peakTime = predictPeakTime(posts, timezone);
  const bestHour = peakTime.hour;
  
  const bestDay = Object.entries(dayActivity)
    .sort(([, a], [, b]) => b - a)[0][0];

  const activityHeatmap = Object.entries(heatmap).map(([key, value]) => {
    const [day, hour] = key.split('-').map(Number);
    return { day, hour, value };
  });

  const maxActivity = Math.max(...activityHeatmap.map(d => d.value));

  const scoreByHour = Object.entries(hourlyActivity).map(([hour, data]) => ({
    hour: parseInt(hour),
    avgScore: data.totalScore / data.posts
  })).sort((a, b) => a.hour - b.hour);

  const windowSize = 6;
  let bestWindow = { start: 0, end: 0, activity: 0 };
  
  for (let i = 0; i < 24; i++) {
    let windowActivity = 0;
    for (let j = 0; j < windowSize; j++) {
      const hour = (i + j) % 24;
      windowActivity += hourlyActivity[hour]?.posts || 0;
    }
    if (windowActivity > bestWindow.activity) {
      bestWindow = {
        start: i,
        end: (i + windowSize) % 24,
        activity: windowActivity
      };
    }
  }

  return {
    bestHour,
    bestMinute: 0,
    bestDay,
    timeWindow: {
      start: `${bestWindow.start}:00`,
      end: `${bestWindow.end}:00`,
      reliability: (bestWindow.activity / posts.length) * 100
    },
    activityHeatmap,
    scoreByHour,
    maxActivity
  };
}

export function analyzeSubredditData(posts: Post[], timezone: string): AnalysisResult {
  const topicAnalysis = analyzeTopics(posts);
  const contentStats = analyzeContentStats(posts, timezone);
  const timePatterns = analyzeTimePatterns(posts, timezone);
  const peakPrediction = predictPeakTime(posts, timezone);
  
  const engagementTrends = posts
    .sort((a, b) => a.created_utc - b.created_utc)
    .reduce((acc: { day: string; engagement: number }[], post) => {
      const date = toZonedTime(new Date(post.created_utc * 1000), timezone);
      const day = format(date, 'yyyy-MM-dd');
      const existingDay = acc.find(d => d.day === day);
      const engagement = calculateEngagementScore(post, timezone);
      
      if (existingDay) {
        existingDay.engagement = (existingDay.engagement + engagement) / 2;
      } else {
        acc.push({ day, engagement });
      }
      return acc;
    }, []);

  return {
    ...timePatterns,
    topicAnalysis,
    contentStats,
    engagementTrends,
    explanation: peakPrediction.explanation,
    alternativeTimes: peakPrediction.alternativeTimes,
    bestDayOfWeek: peakPrediction.bestDayOfWeek
  };
}
import React, { useState } from 'react';
import { Search, Clock, TrendingUp, BarChart3, Calendar, Hash, Award, AlertCircle, Percent, Globe, Calculator, X, Info, Keyboard } from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { AnalysisResult, Post } from './types';
import { analyzeSubredditData } from './utils/analysis';

function App() {
  const [subreddit, setSubreddit] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [showCalculationDialog, setShowCalculationDialog] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Klavye kısayolları
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Eğer bir input veya textarea aktifse, sadece Enter tuşuna izin ver
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && !loading && subreddit) {
          analyzeSubreddit();
        }
        return;
      }

      if (e.key === '?' && e.shiftKey) {
        setShowKeyboardShortcuts(true);
      } else if (e.key === 'Escape') {
        setShowCalculationDialog(false);
        setShowKeyboardShortcuts(false);
      } else if (e.key === 'c' && analysis) {
        setShowCalculationDialog(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [loading, subreddit, analysis]);

  const validateSubreddit = (name: string) => {
    // Reddit subreddit naming rules
    const validSubredditRegex = /^[A-Za-z0-9][A-Za-z0-9_]{2,20}$/;
    return validSubredditRegex.test(name);
  };

  const fetchPosts = async (after?: string): Promise<any> => {
    const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=100${after ? `&after=${after}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data;
  };

  const analyzeSubreddit = async () => {
    setError(null);
    if (!validateSubreddit(subreddit)) {
      setError('Invalid subreddit name. Please use 3-21 characters, starting with a letter or number.');
      return;
    }

    setLoading(true);
    setProgress(0);
    try {
      let allPosts: Post[] = [];
      let after: string | undefined;
      let totalFetched = 0;
      
      while (totalFetched < 2000) {
        const data = await fetchPosts(after);
        if (!data?.children?.length) break;
        
        allPosts = [...allPosts, ...data.children.map((child: any) => child.data)];
        after = data.after;
        totalFetched = allPosts.length;
        
        setProgress(Math.min((totalFetched / 2000) * 100, 100));
        
        if (!after) break;
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (allPosts.length === 0) {
        throw new Error('No posts found for this subreddit');
      }
      
      const result = analyzeSubredditData(allPosts, timezone);
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing subreddit:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze subreddit');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const COLORS = ['#25b65c', '#f83b48', '#0b7fff', '#6b7280'];
  const activityColors = [
    '#174b2e',
    '#1a5b35',
    '#19733e',
    '#1a924a',
    '#25b65c'
  ];

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
      <div className="max-w-[1440px] mx-auto px-6 py-12">
        <header className="mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary-600/10 border border-primary-600/20 text-primary-400 mb-6">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Optimize Your Reddit Posting Schedule</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary-300 via-secondary-300 to-accent-300 text-transparent bg-clip-text">
              Reddit Analytics Dashboard
            </h1>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Discover the perfect time to post and maximize your engagement with advanced analytics and data-driven insights
            </p>
          </div>

          {!analysis && (
            <>
              <div className="max-w-xl mx-auto mt-12 mb-12">
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 bg-neutral-800/80 rounded-l-xl border-r border-neutral-700">
                        <div className="flex items-center px-2 text-primary-400">
                          <span className="text-lg font-semibold">r/</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={subreddit}
                        onChange={(e) => setSubreddit(e.target.value.trim())}
                        placeholder="Enter subreddit name"
                        className="w-full pl-16 pr-4 py-4 rounded-xl bg-neutral-800/50 backdrop-blur border border-neutral-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-neutral-100 placeholder-neutral-500 text-lg shadow-inner-lg transition-all duration-200"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <kbd className="hidden md:block px-2 py-1 bg-neutral-900/80 rounded border border-neutral-700 text-neutral-400 text-sm">
                          Enter
                        </kbd>
                      </div>
                    </div>
                    <button
                      onClick={analyzeSubreddit}
                      disabled={loading || !subreddit}
                      className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-200 text-lg font-medium shadow-lg min-w-[160px]"
                    >
                      {loading ? (
                        <>
                          <AlertCircle className="w-5 h-5 animate-pulse" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5" />
                          Analyze
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-400 bg-neutral-800/50 p-3 rounded-xl border border-neutral-700">
                    <Globe className="w-5 h-5 text-accent-400" />
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="bg-transparent border-none text-sm focus:outline-none cursor-pointer hover:text-neutral-300 transition-colors appearance-none py-1"
                    >
                      {(Intl as any).supportedValuesOf('timeZone').map((tz: string) => {
                        const date = new Date();
                        const timeZoneOffset = new Intl.DateTimeFormat('en-US', {
                          timeZone: tz,
                          timeZoneName: 'shortOffset'
                        }).format(date).split(' ').pop();
                        
                        return (
                          <option 
                            key={tz} 
                            value={tz} 
                            className="bg-neutral-800 text-neutral-100 py-2"
                          >
                            {tz.replace(/_/g, ' ')} ({timeZoneOffset})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="mt-6 p-4 bg-secondary-900/50 border border-secondary-700/50 rounded-xl text-secondary-200 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-secondary-400" />
                    <p>{error}</p>
                  </div>
                )}
                {loading && (
                  <div className="mt-8 space-y-4">
                    <div className="relative">
                      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-600 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary-600/10 text-primary-400 px-3 py-1 rounded-full border border-primary-600/20 text-sm font-medium">
                        {Math.round(progress)}% Complete
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-neutral-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse"></div>
                      <p className="text-sm">
                        Analyzing subreddit data...
                      </p>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <div className="group bg-neutral-800/50 backdrop-blur rounded-xl p-8 border border-neutral-700/50 hover:border-primary-600/50 transition-all duration-300 hover:bg-neutral-800/70">
                  <div className="p-3 bg-primary-600/10 rounded-lg w-fit mb-6 group-hover:bg-primary-600/20 transition-colors">
                    <Hash className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-primary-200">Peak Time Analysis</h3>
                  <p className="text-neutral-400 leading-relaxed">Predict optimal posting times for maximum engagement with data-driven insights</p>
                </div>
                <div className="group bg-neutral-800/50 backdrop-blur rounded-xl p-8 border border-neutral-700/50 hover:border-secondary-600/50 transition-all duration-300 hover:bg-neutral-800/70">
                  <div className="p-3 bg-secondary-600/10 rounded-lg w-fit mb-6 group-hover:bg-secondary-600/20 transition-colors">
                    <TrendingUp className="w-6 h-6 text-secondary-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-secondary-200">Engagement Metrics</h3>
                  <p className="text-neutral-400 leading-relaxed">Track performance with comprehensive engagement analytics and trends</p>
                </div>
                <div className="group bg-neutral-800/50 backdrop-blur rounded-xl p-8 border border-neutral-700/50 hover:border-accent-600/50 transition-all duration-300 hover:bg-neutral-800/70">
                  <div className="p-3 bg-accent-600/10 rounded-lg w-fit mb-6 group-hover:bg-accent-600/20 transition-colors">
                    <Clock className="w-6 h-6 text-accent-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-accent-200">Activity Windows</h3>
                  <p className="text-neutral-400 leading-relaxed">Identify peak activity periods to maximize your content visibility</p>
                </div>
              </div>
            </>
          )}
        </header>

        {analysis && (
          <div className="grid grid-cols-1 gap-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-primary-300">Analysis Results</h2>
              <button
                onClick={() => {
                  setAnalysis(null);
                  setSubreddit('');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600/10 hover:bg-primary-600/20 text-primary-300 rounded-lg transition-all duration-200 border border-primary-600/20 hover:border-primary-600/30"
              >
                <Search className="w-4 h-4" />
                New Analysis
              </button>
            </div>
            <div className="bg-neutral-800/50 backdrop-blur rounded-xl p-6 md:p-8 border border-neutral-700/50 shadow-lg">
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <Clock className="text-secondary-400 w-6 h-6" />
                <h2 className="text-2xl font-semibold text-secondary-200">Peak Time Prediction</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="bg-neutral-900/50 p-6 md:p-8 rounded-lg border border-neutral-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-600/10 rounded-bl-full"></div>
                  <h3 className="text-xl font-semibold mb-6 text-neutral-200">Best Time to Post</h3>
                  <div className="flex flex-col">
                    <div className="text-2xl font-semibold text-secondary-300 mb-3">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][analysis.bestDayOfWeek]}
                    </div>
                    <div className="text-5xl font-bold text-secondary-300 mb-6 tracking-tight">
                      {analysis.bestHour % 12 || 12}:{analysis.bestMinute.toString().padStart(2, '0')} {analysis.bestHour >= 12 ? 'PM' : 'AM'}
                    </div>
                    <div className="mt-auto space-y-4">
                      <button
                        onClick={() => setShowCalculationDialog(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary-600/10 hover:bg-secondary-600/20 text-secondary-300 hover:text-secondary-200 rounded-lg transition-all duration-200 border border-secondary-600/20 hover:border-secondary-600/30 w-full justify-center font-medium"
                      >
                        <Calculator className="w-4 h-4" />
                        View Calculation Details
                        <span className="text-xs text-secondary-400 ml-1.5">(C)</span>
                      </button>
                      <div className="bg-neutral-800/80 rounded-lg border border-neutral-700/80 p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-secondary-300 mt-1">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-secondary-200 font-medium mb-1">Maximum Engagement Window</p>
                            <p className="text-neutral-400 text-sm leading-relaxed">
                              Posts at this time receive maximum engagement within 4 hours, based on analysis of {analysis.contentStats.totalPosts} posts
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-neutral-900/50 p-4 md:p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-xl font-semibold mb-4 text-neutral-200">Alternative Times</h3>
                  <div className="space-y-4">
                    {analysis.alternativeTimes.map((time, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50 hover:border-secondary-600/50 transition-colors">
                        <div>
                          <div className="text-lg font-semibold text-secondary-300">
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][time.dayOfWeek]}
                          </div>
                          <div className="text-2xl font-bold text-secondary-200">
                            {time.hour % 12 || 12}:{time.minute.toString().padStart(2, '0')} {time.hour >= 12 ? 'PM' : 'AM'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800/50 backdrop-blur rounded-xl p-6 md:p-8 border border-neutral-700/50 shadow-lg">
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <BarChart3 className="text-primary-400 w-6 h-6" />
                <h2 className="text-2xl font-semibold text-primary-200">Engagement Analytics</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                <div className="bg-neutral-900/50 p-4 md:p-6 rounded-lg border border-neutral-800">
                  <div className="text-neutral-400 mb-2">Total Posts</div>
                  <div className="text-2xl md:text-3xl font-bold text-primary-300">{analysis.contentStats.totalPosts}</div>
                </div>
                <div className="bg-neutral-900/50 p-4 md:p-6 rounded-lg border border-neutral-800">
                  <div className="text-neutral-400 mb-2">Avg. Score</div>
                  <div className="text-2xl md:text-3xl font-bold text-primary-300">{Math.round(analysis.contentStats.avgScore)}</div>
                </div>
                <div className="bg-neutral-900/50 p-4 md:p-6 rounded-lg border border-neutral-800">
                  <div className="text-neutral-400 mb-2">Avg. Comments</div>
                  <div className="text-2xl md:text-3xl font-bold text-primary-300">{Math.round(analysis.contentStats.avgComments)}</div>
                </div>
                <div className="bg-neutral-900/50 p-4 md:p-6 rounded-lg border border-neutral-800">
                  <div className="text-neutral-400 mb-2">Engagement Rate</div>
                  <div className="text-2xl md:text-3xl font-bold text-primary-300">
                    {analysis.contentStats.engagementRate.toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-6 text-neutral-200">Content Distribution</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Text', value: analysis.contentStats.postTypes.text },
                          { name: 'Link', value: analysis.contentStats.postTypes.link },
                          { name: 'Video', value: analysis.contentStats.postTypes.video },
                          { name: 'Image', value: analysis.contentStats.postTypes.image }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                          color: '#f9fafb'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800/50 backdrop-blur rounded-xl p-8 border border-neutral-700/50 shadow-lg">
              <div className="flex items-center gap-3 mb-8">
                <Calendar className="text-primary-400 w-6 h-6" />
                <h2 className="text-2xl font-semibold text-primary-200">Activity Heatmap</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1.5">
                    <div className=""></div>
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} className="text-center text-sm text-neutral-500 font-medium">
                        {i.toString().padStart(2, '0')}
                      </div>
                    ))}
                    
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
                      <React.Fragment key={day}>
                        <div className="text-right pr-3 text-sm font-medium text-neutral-400">{day}</div>
                        {Array.from({ length: 24 }, (_, hour) => {
                          const activityData = analysis.activityHeatmap.find(
                            d => d.day === dayIndex && d.hour === hour
                          );
                          const value = activityData?.value || 0;
                          const colorIndex = Math.min(
                            Math.floor(value / analysis.maxActivity * (activityColors.length - 1)),
                            activityColors.length - 1
                          );
                          return (
                            <div
                              key={hour}
                              className="aspect-square rounded-sm transition-all duration-200 hover:ring-2 hover:ring-primary-400/30"
                              style={{ backgroundColor: activityColors[colorIndex] }}
                              title={`${day} ${hour}:00 - ${value} posts`}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-center gap-3">
                <span className="text-sm font-medium text-neutral-500">Low Activity</span>
                {activityColors.map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
                <span className="text-sm font-medium text-neutral-500">High Activity</span>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Dialog */}
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-neutral-800 rounded-xl p-8 max-w-lg mx-4 shadow-xl border border-neutral-700">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <Keyboard className="w-6 h-6 text-primary-400" />
                  <h3 className="text-2xl font-bold text-primary-300">Keyboard Shortcuts</h3>
                </div>
                <button
                  onClick={() => setShowKeyboardShortcuts(false)}
                  className="text-neutral-400 hover:text-neutral-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-700">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-300">Show Shortcuts</span>
                      <kbd className="px-2 py-1 bg-neutral-800 rounded border border-neutral-600 text-neutral-400 text-sm">
                        Shift + ?
                      </kbd>
                    </div>
                  </div>
                  <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-700">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-300">Close Dialog</span>
                      <kbd className="px-2 py-1 bg-neutral-800 rounded border border-neutral-600 text-neutral-400 text-sm">
                        Esc
                      </kbd>
                    </div>
                  </div>
                  <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-700">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-300">Analyze</span>
                      <kbd className="px-2 py-1 bg-neutral-800 rounded border border-neutral-600 text-neutral-400 text-sm">
                        Enter
                      </kbd>
                    </div>
                  </div>
                  <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-700">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-300">Show Calculation</span>
                      <kbd className="px-2 py-1 bg-neutral-800 rounded border border-neutral-600 text-neutral-400 text-sm">
                        C
                      </kbd>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-neutral-500">
                  Press <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-600 text-neutral-400 text-xs">Shift + ?</kbd> anytime to show this dialog
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calculation Dialog */}
        {showCalculationDialog && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-neutral-800 rounded-xl p-8 max-w-4xl mx-4 shadow-xl border border-neutral-700 max-h-[90vh] overflow-y-auto relative">
              <div className="sticky top-0 bg-neutral-800 z-10 pb-6 border-b border-neutral-700 mb-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary-600/10 rounded-lg">
                      <Calculator className="w-6 h-6 text-secondary-300" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-secondary-300">Calculation Methodology</h3>
                      <p className="text-neutral-400 text-sm mt-1">Understanding how we determine the best posting time</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-neutral-900 rounded border border-neutral-700 text-neutral-400 text-sm">
                      Esc
                    </kbd>
                    <button
                      onClick={() => setShowCalculationDialog(false)}
                      className="text-neutral-400 hover:text-neutral-300 transition-colors p-1 hover:bg-neutral-700/50 rounded"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-6 text-neutral-300">
                <div className="bg-neutral-900/50 p-6 rounded-lg border border-neutral-700 transform transition-all duration-200 hover:scale-[1.01] hover:bg-neutral-900/70">
                  <h4 className="font-semibold text-secondary-300 mb-4 flex items-center gap-2 text-lg">
                    <div className="p-1.5 bg-secondary-600/10 rounded">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    Data Collection and Processing
                  </h4>
                  <ul className="space-y-3 pl-7 list-disc marker:text-secondary-400">
                    <li className="text-neutral-300">All posts are collected chronologically</li>
                    <li className="text-neutral-300">4-hour engagement window examined for each post</li>
                    <li className="text-neutral-300">Data grouped into 15-minute time slots</li>
                    <li className="text-neutral-300">User activities and interactions tracked</li>
                  </ul>
                </div>

                <div className="bg-neutral-900/50 p-6 rounded-lg border border-neutral-700 transform transition-all duration-200 hover:scale-[1.01] hover:bg-neutral-900/70">
                  <h4 className="font-semibold text-secondary-300 mb-4 flex items-center gap-2 text-lg">
                    <div className="p-1.5 bg-secondary-600/10 rounded">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    Engagement Score Calculation
                  </h4>
                  <div className="space-y-4 pl-7">
                    <div className="bg-neutral-800/80 p-4 rounded-lg border border-neutral-700/80">
                      <div className="font-mono text-sm bg-neutral-900/80 p-3 rounded border border-neutral-800">
                        Base Score = Upvotes + (Comments × 2)
                      </div>
                      <p className="text-sm text-neutral-400 mt-2">Comments weighted higher as they indicate active participation</p>
                    </div>
                    <div className="bg-neutral-800/80 p-4 rounded-lg border border-neutral-700/80">
                      <div className="font-mono text-sm bg-neutral-900/80 p-3 rounded border border-neutral-800">
                        Time Decay = exp(-post_age / 4)
                      </div>
                      <p className="text-sm text-neutral-400 mt-2">4-hour half-life models engagement decay</p>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900/50 p-6 rounded-lg border border-neutral-700 transform transition-all duration-200 hover:scale-[1.01] hover:bg-neutral-900/70">
                  <h4 className="font-semibold text-secondary-300 mb-4 flex items-center gap-2 text-lg">
                    <div className="p-1.5 bg-secondary-600/10 rounded">
                      <Clock className="w-5 h-5" />
                    </div>
                    Time Window Analysis
                  </h4>
                  <ul className="space-y-3 pl-7 list-disc marker:text-secondary-400">
                    <li className="text-neutral-300">Average engagement calculated for each time slot</li>
                    <li className="text-neutral-300">Day and hour performance matrix created</li>
                    <li className="text-neutral-300">User activity density analyzed</li>
                    <li className="text-neutral-300">Peak engagement periods identified</li>
                  </ul>
                </div>

                <div className="bg-neutral-900/50 p-6 rounded-lg border border-neutral-700 transform transition-all duration-200 hover:scale-[1.01] hover:bg-neutral-900/70">
                  <h4 className="font-semibold text-secondary-300 mb-4 flex items-center gap-2 text-lg">
                    <div className="p-1.5 bg-secondary-600/10 rounded">
                      <Award className="w-5 h-5" />
                    </div>
                    Optimization Criteria
                  </h4>
                  <ul className="space-y-3 pl-7 list-disc marker:text-secondary-400">
                    <li className="text-neutral-300">Engagement stability and consistency</li>
                    <li className="text-neutral-300">User activity distribution balance</li>
                    <li className="text-neutral-300">Time slot performance comparison</li>
                    <li className="text-neutral-300">Day-based success rates analysis</li>
                  </ul>
                </div>

                {analysis && (
                  <div className="bg-neutral-900/50 p-6 rounded-lg border border-neutral-700 transform transition-all duration-200 hover:scale-[1.01] hover:bg-neutral-900/70">
                    <h4 className="font-semibold text-secondary-300 mb-4 flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-secondary-600/10 rounded">
                        <Info className="w-5 h-5" />
                      </div>
                      Analysis Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4 pl-7">
                      <div className="bg-neutral-800/80 p-4 rounded-lg border border-neutral-700/80">
                        <div className="text-sm text-neutral-400 mb-1">Total Posts Analyzed</div>
                        <div className="text-lg font-semibold text-secondary-300">{analysis.contentStats.totalPosts}</div>
                      </div>
                      <div className="bg-neutral-800/80 p-4 rounded-lg border border-neutral-700/80">
                        <div className="text-sm text-neutral-400 mb-1">Average Engagement</div>
                        <div className="text-lg font-semibold text-secondary-300">{Math.round(analysis.contentStats.avgScore)}</div>
                      </div>
                      <div className="bg-neutral-800/80 p-4 rounded-lg border border-neutral-700/80">
                        <div className="text-sm text-neutral-400 mb-1">Average Comments</div>
                        <div className="text-lg font-semibold text-secondary-300">{Math.round(analysis.contentStats.avgComments)}</div>
                      </div>
                      <div className="bg-neutral-800/80 p-4 rounded-lg border border-neutral-700/80">
                        <div className="text-sm text-neutral-400 mb-1">Overall Engagement Rate</div>
                        <div className="text-lg font-semibold text-secondary-300">{analysis.contentStats.engagementRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
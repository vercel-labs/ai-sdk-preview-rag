
import { promises as fs } from 'fs';
import path from 'path';

interface Tweet {
  authorName: string;
  handle: string;
  tweetText: string;
  time: string;
  retweets: string;
  likes: string;
  replies: string;
  link: string;
}

interface StructuredTweet {
  id: string;
  content: string;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
  date: string;
  category: string;
  key_points?: string[];
}

async function categorizeTweet(tweet: Tweet): Promise<StructuredTweet> {
  // Extract ID from link
  const id = tweet.link.split('/').pop() || '';
  
  // Convert engagement metrics to numbers
  const likes = parseInt(tweet.likes.replace('K', '000'));
  const retweets = parseInt(tweet.retweets);
  const replies = parseInt(tweet.replies);

  // Categorize based on content
  let category = 'general';
  let key_points: string[] = [];

  if (tweet.tweetText.toLowerCase().includes('marketing')) {
    category = 'marketing_strategy';
  } else if (tweet.tweetText.toLowerCase().includes('money')) {
    category = 'business_advice';
  } else if (likes > 1000) {
    category = 'viral';
  }

  return {
    id,
    content: tweet.tweetText,
    engagement: { likes, retweets, replies },
    date: new Date(tweet.time).toISOString().split('T')[0],
    category,
    key_points
  };
}

async function structureTweets() {
  try {
    // Read raw tweets
    const rawPath = path.join(process.cwd(), 'knowledgebase', 'raw', 'tweets.json');
    const rawContent = await fs.readFile(rawPath, 'utf-8');
    const tweets: Tweet[] = JSON.parse(rawContent);

    // Structure and categorize tweets
    const structuredTweets = await Promise.all(tweets.map(categorizeTweet));

    // Group by category
    const categorized = structuredTweets.reduce((acc, tweet) => {
      if (!acc[tweet.category]) {
        acc[tweet.category] = [];
      }
      acc[tweet.category].push(tweet);
      return acc;
    }, {} as Record<string, StructuredTweet[]>);

    // Save structured data
    const structuredPath = path.join(process.cwd(), 'knowledgebase', 'tweets_structured.json');
    await fs.writeFile(structuredPath, JSON.stringify({
      author_info: {
        handle: "apollonator3000",
        platform: "X/Twitter",
        stats: {
          total_tweets_analyzed: tweets.length,
          date_range: {
            start: new Date(Math.min(...tweets.map(t => new Date(t.time).getTime()))).toISOString().split('T')[0],
            end: new Date(Math.max(...tweets.map(t => new Date(t.time).getTime()))).toISOString().split('T')[0]
          }
        }
      },
      tweet_categories: categorized
    }, null, 2));

    console.log('Tweets structured successfully');
  } catch (error) {
    console.error('Error structuring tweets:', error);
  }
}

structureTweets();
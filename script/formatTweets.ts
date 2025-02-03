import { promises as fs } from 'fs';
import path from 'path';

async function formatTweets() {
  try {
    const rawPath = path.join(process.cwd(), 'knowledgebase', 'raw', 'tweets.json');
    const content = await fs.readFile(rawPath, 'utf-8');
    
    // Convert the malformed data into proper JSON structure
    const tweets = content
      .split(/\d+\s+/)  // Split by number indices
      .filter(Boolean)   // Remove empty entries
      .map(tweetBlock => {
        const lines = tweetBlock.trim().split('\n');
        const tweet: any = {};
        
        lines.forEach(line => {
          if (line.includes('\t')) {
            const [key, value] = line.split('\t');
            if (key && value) {
              tweet[key] = value.replace(/^"|"$/g, ''); // Remove quotes
            }
          }
        });
        
        return tweet;
      });

    // Save as properly formatted JSON
    const formattedPath = path.join(process.cwd(), 'knowledgebase', 'raw', 'tweets_formatted.json');
    await fs.writeFile(
      formattedPath, 
      JSON.stringify({ tweets }, null, 2)
    );

    console.log('Tweets formatted successfully');
    return formattedPath;
  } catch (error) {
    console.error('Error formatting tweets:', error);
    throw error;
  }
}

formatTweets();

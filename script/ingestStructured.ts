import { promises as fs } from 'fs';
import path from 'path';
import { createResource } from '@/lib/actions/resources';

interface ContentMetadata {
  category: string;
  subcategory?: string;
  source: string;
  date_processed: string;
}

async function processAndStructureContent(content: any, metadata: ContentMetadata) {
  return {
    content,
    metadata,
    timestamp: new Date().toISOString()
  };
}

async function ingestStructured() {
  try {
    // Create directory structure if it doesn't exist
    const directories = [
      'knowledgebase/marketing',
      'knowledgebase/tweets',
      'knowledgebase/raw'
    ];

    for (const dir of directories) {
      await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
    }

    // Process and move original files to raw directory
    await fs.rename(
      path.join(process.cwd(), 'knowledgebase/marketingcore.md'),
      path.join(process.cwd(), 'knowledgebase/raw/marketingcore.md')
    );

    await fs.rename(
      path.join(process.cwd(), 'knowledgebase/tweets.json'),
      path.join(process.cwd(), 'knowledgebase/raw/tweets.json')
    );

    // Create structured content
    const marketingContent = await processAndStructureContent(
      require('../knowledgebase/marketingdata.json'),
      {
        category: 'marketing',
        source: 'guide',
        date_processed: new Date().toISOString()
      }
    );

    const tweetsContent = await processAndStructureContent(
      require('../knowledgebase/tweets_structured.json'),
      {
        category: 'social',
        source: 'twitter',
        date_processed: new Date().toISOString()
      }
    );

    // Save structured content
    await fs.writeFile(
      path.join(process.cwd(), 'knowledgebase/marketing/platform_strategies.json'),
      JSON.stringify(marketingContent.content.platform_strategies, null, 2)
    );

    await fs.writeFile(
      path.join(process.cwd(), 'knowledgebase/tweets/marketing_strategies.json'),
      JSON.stringify(tweetsContent.tweet_categories.marketing_strategies, null, 2)
    );

    console.log('Content structured and saved successfully');
  } catch (error) {
    console.error('Error structuring content:', error);
  }
}

ingestStructured();

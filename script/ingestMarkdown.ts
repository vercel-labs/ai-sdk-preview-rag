import { promises as fs } from 'fs';
import path from 'path';
import { createResource } from '@/lib/actions/resources';

async function ingestMarkdown() {
  try {
    const markdownPath = path.join(process.cwd(), 'knowledgebase', 'marketingcore.md');
    const content = await fs.readFile(markdownPath, 'utf-8');
    
    // Split content into smaller chunks if needed
    const chunks = content.split('\n\n');
    
    for (const chunk of chunks) {
      if (chunk.trim()) {
        await createResource({
          content: chunk.trim(),
        });
        console.log('Ingested chunk successfully');
      }
    }
    
    console.log('Markdown ingestion complete');
  } catch (error) {
    console.error('Error ingesting markdown:', error);
  }
}

ingestMarkdown();

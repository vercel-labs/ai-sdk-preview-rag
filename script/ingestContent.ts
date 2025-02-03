import { promises as fs } from 'fs';
import path from 'path';
import { createResource } from '@/lib/actions/resources';

async function processMarkdown(content: string) {
  // Split by headers or larger paragraph breaks to get more meaningful chunks
  const chunks = content.split(/(?=^#{1,6}\s|\n\n\n)/m)
    .filter(chunk => chunk.trim());
  return chunks;
}

async function processJSON(content: string) {
  const jsonData = JSON.parse(content);
  // Assuming JSON is an array of content items or has a content field
  if (Array.isArray(jsonData)) {
    return jsonData.map(item => typeof item === 'string' ? item : JSON.stringify(item));
  }
  return [JSON.stringify(jsonData)];
}

async function ingestContent(filePath: string) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileExt = path.extname(filePath).toLowerCase();
    
    let chunks: string[] = [];
    
    if (fileExt === '.md') {
      chunks = await processMarkdown(content);
    } else if (fileExt === '.json') {
      chunks = await processJSON(content);
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }

    console.log(`Found ${chunks.length} chunks to process`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk.trim()) {
        await createResource({
          content: chunk.trim(),
        });
        console.log(`Processed chunk ${i + 1}/${chunks.length}`);
      }
    }
    
    console.log(`Successfully finished ingesting ${filePath}`);
  } catch (error) {
    console.error('Error ingesting content:', error);
  }
}

// Get file path from command line argument or use default
const filePath = process.argv[2] || path.join(process.cwd(), 'knowledgebase', 'marketingcore.md');
ingestContent(filePath);

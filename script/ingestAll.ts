import { promises as fs } from 'fs';
import path from 'path';
import { createResource } from '@/lib/actions/resources';

async function ingestAll() {
  const knowledgebasePath = path.join(process.cwd(), 'knowledgebase');
  const stats = {
    success: 0,
    failed: 0,
    files: [] as string[]
  };

  try {
    // Recursively get all files in knowledgebase directory
    async function getAllFiles(dir: string): Promise<string[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory() ? getAllFiles(fullPath) : fullPath;
      }));
      return files.flat();
    }

    const files = await getAllFiles(knowledgebasePath);
    console.log(`Found ${files.length} files to process`);

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const fileType = path.extname(file);
        console.log(`Processing ${file}`);

        if (fileType === '.json') {
          // Handle JSON files
          const jsonData = JSON.parse(content);
          const jsonString = JSON.stringify(jsonData, null, 2);
          await createResource({
            content: jsonString,
            metadata: {
              source: 'knowledgebase',
              type: 'json',
              filename: path.basename(file)
            }
          });
        } else if (fileType === '.md') {
          // Handle Markdown files - split into sections
          const sections = content.split(/\n#{1,6}\s/);
          for (const section of sections) {
            if (section.trim()) {
              await createResource({
                content: section.trim(),
                metadata: {
                  source: 'knowledgebase',
                  type: 'markdown',
                  filename: path.basename(file)
                }
              });
            }
          }
        }

        stats.success++;
        stats.files.push(file);
        console.log(`Successfully processed ${file}`);
      } catch (error) {
        console.error(`Failed to process ${file}:`, error);
        stats.failed++;
      }
    }

    console.log('\nIngestion Summary:');
    console.log('----------------');
    console.log(`Total files processed: ${stats.success + stats.failed}`);
    console.log(`Successfully processed: ${stats.success}`);
    console.log(`Failed to process: ${stats.failed}`);
    console.log('\nProcessed files:');
    stats.files.forEach(file => console.log(`- ${path.relative(knowledgebasePath, file)}`));

  } catch (error) {
    console.error('Fatal error during ingestion:', error);
  }
}

ingestAll();

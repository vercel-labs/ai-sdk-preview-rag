# AI SDK RAG Template

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnicoalbanese%2Fai-sdk-rag-template&env=OPENAI_API_KEY,DATABASE_URL&envDescription=You%20will%20need%20an%20OPENAI%20API%20Key%20and%20a%20Postgres%20connection%20string.&project-name=ai-sdk-rag&repository-name=ai-sdk-rag)

## Getting Started

To get the project up and running, follow these steps:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Add your OpenAI API key and PostgreSQL connection string to the `.env` file:
   ```
   OPENAI_API_KEY=your_api_key_here
   DATABASE_URL=your_postgres_connection_string_here
   ```

4. Push the database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

Your project should now be running on [http://localhost:3000](http://localhost:3000).
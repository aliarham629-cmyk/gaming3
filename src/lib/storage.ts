import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

interface DbSchema {
  apiKeys: any[];
  websites: any[];
  articles: any[];
}

export class StorageService {
  private static async ensureDb() {
    try {
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
      await fs.access(DB_PATH);
    } catch {
      const initial: DbSchema = { apiKeys: [], websites: [], articles: [] };
      await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2));
    }
  }

  static async read(): Promise<DbSchema> {
    await this.ensureDb();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  }

  static async write(data: DbSchema) {
    await this.ensureDb();
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  }
}

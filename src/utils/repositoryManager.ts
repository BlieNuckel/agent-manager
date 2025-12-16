import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
import type { Repository, RepositoryConfig } from '../types';

const REPO_CONFIG_PATH = path.join(os.homedir(), '.agent-manager', 'repositories.json');

export class RepositoryManager {
  private static async ensureConfigDir(): Promise<void> {
    const configDir = path.dirname(REPO_CONFIG_PATH);
    await fs.mkdir(configDir, { recursive: true });
  }

  static async loadRepositories(): Promise<RepositoryConfig> {
    try {
      await this.ensureConfigDir();
      const data = await fs.readFile(REPO_CONFIG_PATH, 'utf-8');
      return JSON.parse(data) as RepositoryConfig;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { repositories: [] };
      }
      throw error;
    }
  }

  static async saveRepositories(config: RepositoryConfig): Promise<void> {
    await this.ensureConfigDir();
    await fs.writeFile(REPO_CONFIG_PATH, JSON.stringify(config, null, 2));
  }

  static async addRepository(name: string, repoPath: string): Promise<void> {
    const config = await this.loadRepositories();

    // Check if name already exists
    if (config.repositories.find(r => r.name === name)) {
      throw new Error(`Repository with name '${name}' already exists`);
    }

    // Resolve to absolute path
    const absolutePath = path.resolve(repoPath);

    // Verify path exists and is a directory
    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        throw new Error(`Path '${absolutePath}' is not a directory`);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Path '${absolutePath}' does not exist`);
      }
      throw error;
    }

    // Check if it's a git repository
    try {
      await fs.stat(path.join(absolutePath, '.git'));
    } catch {
      throw new Error(`Path '${absolutePath}' is not a git repository`);
    }

    config.repositories.push({
      name,
      path: absolutePath,
      isDefault: config.repositories.length === 0, // First repo becomes default
    });

    await this.saveRepositories(config);
  }

  static async removeRepository(name: string): Promise<void> {
    const config = await this.loadRepositories();

    const index = config.repositories.findIndex(r => r.name === name);
    if (index === -1) {
      throw new Error(`Repository '${name}' not found`);
    }

    const wasDefault = config.repositories[index].isDefault;
    config.repositories.splice(index, 1);

    // If we removed the default and there are still repos, make the first one default
    if (wasDefault && config.repositories.length > 0) {
      config.repositories[0].isDefault = true;
    }

    await this.saveRepositories(config);
  }

  static async setDefaultRepository(name: string): Promise<void> {
    const config = await this.loadRepositories();

    const repo = config.repositories.find(r => r.name === name);
    if (!repo) {
      throw new Error(`Repository '${name}' not found`);
    }

    // Clear existing default
    config.repositories.forEach(r => {
      r.isDefault = false;
    });

    // Set new default
    repo.isDefault = true;

    await this.saveRepositories(config);
  }

  static async getDefaultRepository(): Promise<Repository | undefined> {
    const config = await this.loadRepositories();
    return config.repositories.find(r => r.isDefault);
  }

  static async getRepository(name: string): Promise<Repository | undefined> {
    const config = await this.loadRepositories();
    return config.repositories.find(r => r.name === name);
  }
}
export interface TemplateFrontmatter {
  template: string;
  version?: number;
  [key: string]: unknown;
}

export interface TemplateSchema {
  requiredFields: string[];
  optionalFields: string[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  source: 'system' | 'user';
  path: string;
  schema?: TemplateSchema;
  content: string;
}

export interface TemplatedArtifact {
  name: string;
  path: string;
  modifiedAt: Date;
  frontmatter?: TemplateFrontmatter;
  templateId?: string;
  templateValid?: boolean;
}

import type { Db } from 'mongodb';
import type { Tool } from '../../domain/types';
import { slugify } from '../../export/filename';

export async function createTool(db: Db, input: Omit<Tool, '_id'>): Promise<Tool> {
  const name = input.name.trim();
  const _id = slugify(name);
  if (!_id) throw new Error('Give the tool a name with letters or digits.');
  const tools = db.collection<Tool>('tools');
  const clash = await tools.findOne({ $or: [{ _id }, { name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] });
  if (clash) throw new Error(`A tool called "${clash.name}" already exists.`);
  const tool: Tool = { ...input, name, _id };
  await tools.insertOne(tool);
  return tool;
}

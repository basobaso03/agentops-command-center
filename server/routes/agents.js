import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

router.get('/', async (request, response, next) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    response.json(data ?? []);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (request, response, next) => {
  try {
    const { id } = request.params;

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return response.status(404).json({ error: 'Agent not found' });
    }

    response.json(data);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (request, response, next) => {
  try {
    const { id } = request.params;
    const allowedFields = [
      'name',
      'department',
      'role',
      'description',
      'status',
      'capabilities',
      'performance_score',
      'tasks_completed',
      'avg_response_ms',
      'system_prompt'
    ];

    const updates = Object.fromEntries(
      allowedFields
        .filter((field) => request.body[field] !== undefined)
        .map((field) => [field, request.body[field]])
    );

    if (Object.keys(updates).length === 0) {
      return response.status(400).json({ error: 'No valid fields provided for update' });
    }

    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return response.status(404).json({ error: 'Agent not found' });
    }

    response.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

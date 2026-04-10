import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

router.get('/', async (request, response, next) => {
  try {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });

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
      .from('workflows')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return response.status(404).json({ error: 'Workflow not found' });
    }

    response.json(data);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (request, response, next) => {
  try {
    const { id } = request.params;
    const body = request.body || {};

    const { data: existingWorkflow, error: existingError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existingWorkflow) {
      return response.status(404).json({ error: 'Workflow not found' });
    }

    const updates = {};

    if (typeof body.is_active === 'boolean') {
      updates.is_active = body.is_active;
    } else if (body.toggle_active || body.toggleActive) {
      updates.is_active = !existingWorkflow.is_active;
    }

    if (body.run_count !== undefined) {
      updates.run_count = Number(body.run_count);
    }

    if (body.increment_run_count) {
      updates.run_count = Number(existingWorkflow.run_count || 0) + 1;
    }

    const editableFields = ['name', 'description', 'trigger_type', 'steps', 'last_run'];

    for (const field of editableFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return response.status(400).json({ error: 'No valid fields provided for update' });
    }

    const { data, error } = await supabase
      .from('workflows')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    response.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

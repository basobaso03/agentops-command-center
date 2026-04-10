import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

router.get('/', async (request, response, next) => {
  try {
    const { category } = request.query;
    let query = supabase.from('kb_articles').select('*').order('updated_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

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
      .from('kb_articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return response.status(404).json({ error: 'Article not found' });
    }

    response.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const { title, content, category, status = 'published' } = request.body || {};

    if (!title || !content || !category) {
      return response.status(400).json({ error: 'title, content, and category are required' });
    }

    const articlePayload = {
      title,
      content,
      category,
      status,
      version: 1,
      updated_at: new Date().toISOString()
    };

    const { data: article, error: articleError } = await supabase
      .from('kb_articles')
      .insert([articlePayload])
      .select('*')
      .single();

    if (articleError) {
      throw articleError;
    }

    const { error: versionError } = await supabase.from('kb_versions').insert([
      {
        article_id: article.id,
        version: 1,
        title: article.title,
        content: article.content,
        change_summary: 'Initial version created'
      }
    ]);

    if (versionError) {
      throw versionError;
    }

    response.status(201).json(article);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (request, response, next) => {
  try {
    const { id } = request.params;
    const { title, content, category, status, change_summary } = request.body || {};

    const { data: existingArticle, error: existingError } = await supabase
      .from('kb_articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existingArticle) {
      return response.status(404).json({ error: 'Article not found' });
    }

    const nextVersion = Number(existingArticle.version || 1) + 1;

    const updates = {
      title: title ?? existingArticle.title,
      content: content ?? existingArticle.content,
      category: category ?? existingArticle.category,
      status: status ?? existingArticle.status,
      version: nextVersion,
      updated_at: new Date().toISOString()
    };

    const { error: versionError } = await supabase.from('kb_versions').insert([
      {
        article_id: existingArticle.id,
        version: nextVersion,
        title: updates.title,
        content: updates.content,
        change_summary: change_summary || 'Article updated'
      }
    ]);

    if (versionError) {
      throw versionError;
    }

    const { data, error } = await supabase
      .from('kb_articles')
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

router.get('/:id/versions', async (request, response, next) => {
  try {
    const { id } = request.params;

    const { data, error } = await supabase
      .from('kb_versions')
      .select('*')
      .eq('article_id', id)
      .order('version', { ascending: false });

    if (error) {
      throw error;
    }

    response.json(data ?? []);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (request, response, next) => {
  try {
    const { id } = request.params;

    const { data, error } = await supabase
      .from('kb_articles')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return response.status(404).json({ error: 'Article not found' });
    }

    response.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

export default router;

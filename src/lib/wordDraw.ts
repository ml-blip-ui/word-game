import { supabase } from './supabase';
import { pickRandomBucket, type CategoryKey, type WordCategoryKey } from './categories';
import type { DrawnWord } from './types';

async function drawWordFromCategory(category: WordCategoryKey): Promise<DrawnWord> {
  const { data, error } = await supabase.rpc('draw_word', { p_category: category });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(`No words left to draw in category "${category}".`);
  return { kind: 'word', id: row.id, text: row.prompt, category };
}

async function drawSong(): Promise<DrawnWord> {
  const { data, error } = await supabase.rpc('draw_song', {});
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('No songs left to draw.');
  return { kind: 'song', id: row.id, title: row.title, artist: row.artist };
}

// The wheel lands on one category for the whole turn (spec §4). For Random,
// each individual word draw independently rolls which pool it comes from.
export async function drawNext(categoryKey: CategoryKey): Promise<DrawnWord> {
  if (categoryKey === 'random') {
    const bucket = pickRandomBucket();
    return bucket === 'song' ? drawSong() : drawWordFromCategory(bucket);
  }
  return drawWordFromCategory(categoryKey);
}

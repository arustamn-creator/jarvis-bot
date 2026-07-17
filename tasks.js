const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Добавить задачу
async function addTask(chatId, title) {
    const { data, error } = await supabase
        .from('tasks')
        .insert({ chat_id: String(chatId), title, status: 'pending' })
        .select('id, title')
        .single();
    if (error) throw error;
    return data;
}

// Список задач по статусу
async function listTasks(chatId, status = 'pending') {
    const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, created_at')
        .eq('chat_id', String(chatId))
        .eq('status', status)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

// Отметить задачу выполненной по её номеру в списке /tasks (1-based) —
// без коротких id: показывать пользователю UUID в Telegram неудобно, а
// порядковый номер по created_at достаточно стабилен для одного чата.
async function completeTaskByIndex(chatId, index) {
    const pending = await listTasks(chatId, 'pending');
    const task = pending[index - 1];
    if (!task) return null;

    const { error } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', task.id);
    if (error) throw error;
    return task;
}

module.exports = { addTask, listTasks, completeTaskByIndex };

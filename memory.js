const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Сохранить сообщение в историю
async function saveMessage(chatId, role, content) {
    await supabase.from('messages').insert({
        chat_id: String(chatId),
        role: role,
        content: content
    });
}

// Получить историю чата
async function getHistory(chatId, limit = 20) {
    const { data } = await supabase
        .from('messages')
        .select('role, content')
        .eq('chat_id', String(chatId))
        .order('created_at', { ascending: false })
        .limit(limit);
    const history = (data || []).reverse();
    // Anthropic требует, чтобы первая запись была от user — срез по limit
    // может отрезать user-половину старейшей пары, и тогда каждый запрос
    // падал бы с 400 и уходил в Groq-fallback.
    while (history.length && history[0].role !== 'user') {
        history.shift();
    }
    return history;
}

// Очистить историю чата
async function clearHistory(chatId) {
    await supabase
        .from('messages')
        .delete()
        .eq('chat_id', String(chatId));
    console.log('🗑️ История очищена');
}

module.exports = { saveMessage, getHistory, clearHistory };
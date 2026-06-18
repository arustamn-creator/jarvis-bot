from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)

def save_task(task_name, status="pending", project="jarvis"):
    data = supabase.table("tasks").insert({
        "tasks": task_name,
        "status": status,
        "project": project
    }).execute()
    print(f"✅ Задача сохранена: {task_name}")
    return data

def get_tasks(project="jarvis"):
    data = supabase.table("tasks").select("*").eq("project", project).execute()
    return data.data

# Тест
if __name__ == "__main__":
    print("🔌 Подключение к Supabase...")
    save_task("Настроить память Джарвиса", "done")
    save_task("Подключить Chatwoot", "pending")
    tasks = get_tasks()
    print("📋 Задачи:", tasks)
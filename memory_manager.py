import chromadb
from sentence_transformers import SentenceTransformer
from datetime import datetime

class JarvisMemory:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./memory_db")
        self.collection = self.client.get_or_create_collection("jarvis_memory")
        self.model = SentenceTransformer("multi-qa-MiniLM-L6-cos-v1")
        print("✅ Память Джарвиса загружена")

    def remember(self, text, user_id="jarvis"):
        embedding = self.model.encode(text).tolist()
        doc_id = f"{user_id}_{datetime.now().timestamp()}"
        self.collection.add(
            documents=[text],
            embeddings=[embedding],
            ids=[doc_id],
            metadatas=[{"user_id": user_id, "time": str(datetime.now())}]
        )
        print(f"✅ Запомнил: {text}")

    def recall(self, query, user_id="jarvis", n=3):
        embedding = self.model.encode(query).tolist()
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=n,
            where={"user_id": user_id}
        )
        return results["documents"][0] if results["documents"] else []

# Тест
if __name__ == "__main__":
    m = JarvisMemory()
    m.remember("Клиент Иван, онлайн-школа Python, бюджет 50к")
    m.remember("Проект makhachkala_bot на Vercel, стек Python+Telegram")
    results = m.recall("что знаем про проекты?")
    print("🔍 Найдено:", results)
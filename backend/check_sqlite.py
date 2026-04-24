
import asyncio
import aiosqlite

async def check():
    try:
        async with aiosqlite.connect("fedcare.db") as db:
            async with db.execute("SELECT name FROM sqlite_master WHERE type='table'") as cursor:
                tables = await cursor.fetchall()
                print(f"Tables in fedcare.db: {tables}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())

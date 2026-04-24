
import asyncio
import aiosqlite

async def update():
    async with aiosqlite.connect('fedcare.db') as db:
        await db.execute('UPDATE datasets SET hospital_id=4 WHERE id IN (2, 3)')
        await db.commit()
        print("Updated datasets 2 and 3 to hospital_id 4")

if __name__ == "__main__":
    asyncio.run(update())

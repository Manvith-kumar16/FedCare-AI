
import asyncio
import aiosqlite
import json

async def check():
    async with aiosqlite.connect('fedcare.db') as db:
        db.row_factory = aiosqlite.Row
        async with db.execute('SELECT id, hospital_id, filename, created_at FROM datasets') as c:
            datasets = [dict(r) for r in await c.fetchall()]
            for d in datasets:
                print(f"ID: {d['id']}, HospID: {d['hospital_id']}, File: {d['filename']}, Created: {d['created_at']}")

if __name__ == "__main__":
    asyncio.run(check())

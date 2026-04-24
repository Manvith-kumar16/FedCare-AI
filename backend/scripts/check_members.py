
import asyncio
import aiosqlite

async def check():
    async with aiosqlite.connect('fedcare.db') as db:
        db.row_factory = aiosqlite.Row
        async with db.execute('''
            SELECT sm.id, sm.hospital_id, h.name as hospital_name, sm.server_id, sm.status 
            FROM server_members sm 
            JOIN hospitals h ON sm.hospital_id = h.id
        ''') as c:
            members = [dict(r) for r in await c.fetchall()]
            print("--- SERVER MEMBERS ---")
            for m in members:
                print(f"ID: {m['id']}, HospID: {m['hospital_id']}, Name: {m['hospital_name']}, ServerID: {m['server_id']}, Status: {m['status']}")

if __name__ == "__main__":
    asyncio.run(check())

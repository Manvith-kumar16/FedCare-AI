
import asyncio
import aiosqlite

async def delete_dummies():
    async with aiosqlite.connect('fedcare.db') as db:
        # Delete datasets from hospitals 1, 2, 3
        await db.execute('DELETE FROM datasets WHERE hospital_id IN (1, 2, 3)')
        # Delete server membership for hospitals 1, 2, 3
        await db.execute('DELETE FROM server_members WHERE hospital_id IN (1, 2, 3)')
        await db.commit()
        print("Deleted dummy nodes (Hospitals 1, 2, 3) and their datasets.")

if __name__ == "__main__":
    asyncio.run(delete_dummies())

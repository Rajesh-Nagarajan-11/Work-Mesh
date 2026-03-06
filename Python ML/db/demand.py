from bson import ObjectId
from db.mongo import get_db

async def fetch_org_projects(org_id: str) -> list[dict]:
    db = get_db()
    return await db.projects.find({"organizationId": ObjectId(org_id)}).to_list(None)


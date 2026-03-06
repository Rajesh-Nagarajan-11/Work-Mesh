"""
db/mongo.py — Async MongoDB client using motor
Fetches employees, their skills, project history (client feedback) for scoring
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/workmesh")
_client: AsyncIOMotorClient = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client


def get_db():
    return get_client()[MONGO_URI.split("/")[-1]]


async def fetch_employees_with_skills(
    org_id: str,
    required_skill_ids: list[str] | None = None,
) -> list[dict]:
    """
    Returns employees with:
      - all ER diagram fields (availability_status, performance_rating, etc.)
      - their EmployeeSkill records (skill_id, proficiency_level)
      - avg performance_feedback, filtered to ONLY past projects whose tech stack
        overlaps with the current project's required_skill_ids (stack-aware feedback).

    If required_skill_ids is empty/None the filter is skipped (all feedback counted).
    """
    db = get_db()
    org_oid = ObjectId(org_id)

    # 1. Fetch all employees in org
    employees = await db.employees.find(
        {"organizationId": org_oid},
        {
            "name": 1, "role": 1, "department": 1,
            "availability": 1,
            "availability_status": 1,
            "total_experience_years": 1,
            "communication_score": 1,
            "teamwork_score": 1,
            "performance_rating": 1,
            "error_rate": 1,
            "location": 1,
        }
    ).to_list(None)

    emp_ids = [e["_id"] for e in employees]

    # 2. Fetch all EmployeeSkills for these employees
    emp_skills = await db.employeeskills.find(
        {"emp_id": {"$in": emp_ids}},
        {"emp_id": 1, "skill_id": 1, "proficiency_level": 1, "years_experience": 1}
    ).to_list(None)

    # Group by emp_id
    skills_map: dict[str, list] = {}
    for es in emp_skills:
        eid = str(es["emp_id"])
        skills_map.setdefault(eid, []).append(es)

    # 3. Build stack-aware feedback aggregation
    #    Join: employeeprojecthistories → projects via project_id
    #    Filter: only keep history records where the past project's requiredSkills
    #            intersect with the current project's required_skill_ids.
    req_oids: list[ObjectId] = []
    if required_skill_ids:
        for sid in required_skill_ids:
            try:
                req_oids.append(ObjectId(sid))
            except Exception:
                pass  # string IDs that aren't ObjectId — skip gracefully

    history_pipeline: list[dict] = [
        # Stage 1: only employees in scope with valid feedback
        {"$match": {
            "emp_id": {"$in": emp_ids},
            "performance_feedback": {"$ne": None},
        }},
        # Stage 2: join to the project to get its required skill IDs
        {"$lookup": {
            "from": "projects",
            "localField": "project_id",
            "foreignField": "_id",
            "as": "_proj",
        }},
        # Stage 3: unwind (history records without a matching project are dropped)
        {"$unwind": {"path": "$_proj", "preserveNullAndEmptyArrays": False}},
    ]

    if req_oids:
        # Stage 4: keep only records where the past project's requiredSkills
        # list contains at least one of the current project's required skill IDs.
        # requiredSkills is an array of objects with a skillId field.
        history_pipeline.append({"$match": {
            "$expr": {
                "$gt": [
                    {"$size": {
                        "$ifNull": [
                            {"$filter": {
                                "input": {"$ifNull": ["$_proj.requiredSkills", []]},
                                "as": "rs",
                                "cond": {"$in": ["$$rs.skillId", req_oids]},
                            }},
                            [],
                        ]
                    }},
                    0,
                ]
            }
        }})

    history_pipeline += [
        # Stage 5: group and average filtered feedback per employee
        {"$group": {
            "_id": "$emp_id",
            "avg_feedback":    {"$avg": "$performance_feedback"},
            # stack_feedback_count = how many stack-relevant projects contributed to avg
        }},
    ]

    history_records = await db.employeeprojecthistories.aggregate(history_pipeline).to_list(None)
    feedback_map = {str(h["_id"]): h["avg_feedback"] for h in history_records}

    # 3b. UNFILTERED queries for card display — always shows real numbers.
    #     Two separate aggregations:
    #       - projects_count: total past projects (unfiltered)
    #       - plain_feedback: overall avg feedback as fallback when stack-filter finds nothing
    plain_pipeline = [
        {"$match": {"emp_id": {"$in": emp_ids}, "performance_feedback": {"$ne": None}}},
        {"$group": {
            "_id": "$emp_id",
            "projects_count":  {"$sum": 1},           # count ALL history records
            "plain_feedback":  {"$avg": "$performance_feedback"},
        }},
    ]
    plain_records = await db.employeeprojecthistories.aggregate(plain_pipeline).to_list(None)
    plain_map = {str(h["_id"]): h for h in plain_records}

    # 4. Merge
    result = []
    for emp in employees:
        eid = str(emp["_id"])
        avail = emp.get("availability", {})
        status = emp.get("availability_status") or avail.get("status") or "Available"
        result.append({
            "id": eid,
            "name": emp.get("name", ""),
            "role": emp.get("role", ""),
            "department": emp.get("department", ""),
            "availability_status": status,
            "current_project": avail.get("currentProject"),
            "total_experience_years": emp.get("total_experience_years", 0) or 0,
            "communication_score": emp.get("communication_score") or 5.0,
            "teamwork_score": emp.get("teamwork_score") or 5.0,
            "performance_rating": emp.get("performance_rating") or 5.0,
            "error_rate": emp.get("error_rate") or 0.0,
            "skills": [
                {
                    "skill_id": str(s["skill_id"]),
                    "proficiency_level": s.get("proficiency_level", 1),
                    "years_experience": s.get("years_experience", 0),
                }
                for s in skills_map.get(eid, [])
            ],
            # Stack-filtered feedback for scoring (only relevant past projects)
            # Falls back to overall avg if no stack-relevant projects found
            "avg_client_feedback": feedback_map.get(eid) or plain_map.get(eid, {}).get("plain_feedback"),
            # Unfiltered total: always shows real project history in the card
            "projects_count": plain_map.get(eid, {}).get("projects_count", 0),
        })


    return result




async def fetch_project(project_id: str) -> dict | None:
    """Fetch a project document by ID."""
    db = get_db()
    proj = await db.projects.find_one({"_id": ObjectId(project_id)})
    return proj



async def fetch_org_projects(org_id: str) -> list[dict]:
    """Fetch High-priority project documents for an organization."""
    db = get_db()
    # Pull projects that are NOT completed AND have a priority of 'High'
    return await db.projects.find({
        "organizationId": ObjectId(org_id), 
        "status": {"$ne": "Completed"},
        "priority": "High"
    }).to_list(None)

async def fetch_skill_ids(org_id: str, skill_names: list[str]) -> dict[str, str]:
    """Map skill_name → skill._id for required skills lookup."""
    db = get_db()
    docs = await db.skills.find(
        {"organizationId": ObjectId(org_id), "skill_name": {"$in": skill_names}},
        {"skill_name": 1}
    ).to_list(None)
    return {d["skill_name"]: str(d["_id"]) for d in docs}


async def fetch_all_skills_map(org_id: str) -> dict[str, str]:
    """Map skill._id → skill_name for an organization."""
    db = get_db()
    docs = await db.skills.find(
        {"organizationId": ObjectId(org_id)},
        {"skill_name": 1}
    ).to_list(None)
    return {str(d["_id"]): d.get("skill_name", "") for d in docs}



async def fetch_busy_employee_ids(
    project_start,
    project_end,
    exclude_project_id: str | None = None,
) -> dict[str, float]:
    """
    Returns dict {employee_id: total_booked_pct} for employees who have
    allocations overlapping with [project_start, project_end].

    Overlap condition (Allen's interval algebra):
        existing.start <= project_end  AND  (existing.end IS NULL OR existing.end >= project_start)

    exclude_project_id: skip allocations for this project (avoids contaminating
        the busy list with the current project's own allocations).

    If project_start is None, returns empty dict (cannot filter without dates).
    """
    if not project_start:
        return {}

    db = get_db()
    from datetime import datetime, timezone, timedelta

    def _to_naive_utc(val) -> datetime | None:
        """Normalize to a naive UTC datetime for consistent MongoDB comparison."""
        if val is None:
            return None
        if isinstance(val, datetime):
            if val.tzinfo is not None:
                return val.astimezone(timezone.utc).replace(tzinfo=None)
            return val
        if isinstance(val, str):
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return None

    start_dt = _to_naive_utc(project_start)
    end_dt   = _to_naive_utc(project_end)

    match_filter: dict = {}
    if end_dt:
        match_filter["allocation_start_date"] = {"$lte": end_dt}
    if start_dt:
        match_filter["$or"] = [
            {"allocation_end_date": None},
            {"allocation_end_date": {"$gte": start_dt}},
        ]

    # Exclude this project's own existing allocations
    if exclude_project_id:
        try:
            match_filter["project_id"] = {"$ne": ObjectId(exclude_project_id)}
        except Exception:
            pass  # invalid id — skip filter

    docs = await db.allocations.find(
        match_filter, {"emp_id": 1, "allocation_percentage": 1}
    ).to_list(None)

    # Sum booked % per employee across all overlapping projects
    booked: dict[str, float] = {}
    for d in docs:
        eid = str(d["emp_id"])
        booked[eid] = booked.get(eid, 0.0) + float(d.get("allocation_percentage", 100))

    return booked

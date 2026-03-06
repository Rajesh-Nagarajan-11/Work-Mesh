from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

from db.mongo import fetch_org_projects, fetch_employees_with_skills, fetch_all_skills_map

router = APIRouter(prefix="/demand", tags=["Hiring Demand"])

@router.get("/{organization_id}")
async def get_hiring_demand(organization_id: str) -> Any:
    """
    Analyzes workforce skill gaps by aggregating required skills across all active projects
    and comparing them against the current employees' skills.
    Returns:
       - top_missing_skills: ranked list of skills in demand but low in supply
       - projects_at_risk: projects that require these missing skills
    """
    # 1. Fetch all active projects
    projects = await fetch_org_projects(organization_id)
    if not projects:
        return {"top_missing_skills": [], "projects_at_risk": []}

    # 2. Fetch all skills mapping to resolve names
    skill_map = await fetch_all_skills_map(organization_id)

    # 3. Aggregate Demand (Requirements)
    demand = {} # skill_id -> { "skill_id": str, "skill_name": str, "project_count": int, "total_weight": float, "projects": list }
    
    for proj in projects:
        proj_id = str(proj["_id"])
        proj_name = proj.get("name", "Unknown Project")
        for rs in proj.get("requiredSkills", []):
            sid = rs.get("skillId")
            sname = rs.get("skillName", "")
            if not sid and sname:
                # Need to lookup sid by name (reverse mapping)
                for map_id, map_name in skill_map.items():
                    if map_name == sname:
                        sid = map_id
                        break
            
            if not sid:
                continue
            
            if not sname:
                sname = skill_map.get(sid, str(sid))

            weight = float(rs.get("weight", 50))
            
            if sid not in demand:
                demand[sid] = {
                    "skill_id": sid,
                    "skill_name": sname,
                    "project_count": 0,
                    "total_weight": 0.0,
                    "projects": []
                }
            
            demand[sid]["project_count"] += 1
            demand[sid]["total_weight"] += weight
            if proj_name not in demand[sid]["projects"]:
                demand[sid]["projects"].append(proj_name)

    # 4. Aggregate Supply (Employee Skills)
    employees = await fetch_employees_with_skills(organization_id)
    
    # We count an employee as supplying a skill if proficiency > 0
    supply = {sid: 0 for sid in demand.keys()}
    
    for emp in employees:
        for s in emp.get("skills", []):
            sid = s.get("skill_id")
            prof = float(s.get("proficiency_level", 0))
            if sid in supply and prof >= 1: # at least beginner
                supply[sid] += 1

    # 5. Calculate Gap Score
    # Simple formula: (Total Weight of projects needing this) / (Supply Count + 1)
    # This boosts skills that are highly needed but absent
    results = []
    projects_at_risk = {}

    for sid, data in demand.items():
        sup = supply[sid]
        # Only care about things where supply is very low compared to demand
        # E.g., if project_count > supply
        if data["project_count"] > sup or sup <= 2:
            gap_score = data["total_weight"] / (sup + 1)
            results.append({
                "skill_id": data["skill_id"],
                "skill_name": data["skill_name"],
                "demand_project_count": data["project_count"],
                "supply_employee_count": sup,
                "gap_score": gap_score,
                "affected_projects": data["projects"]
            })
            
            # Record risk for projects
            for p_name in data["projects"]:
                if p_name not in projects_at_risk:
                    projects_at_risk[p_name] = {"project_name": p_name, "critical_missing_skills": []}
                projects_at_risk[p_name]["critical_missing_skills"].append(data["skill_name"])

    # Sort skills by gap score DESC
    results.sort(key=lambda x: x["gap_score"], reverse=True)
    
    # Sort projects by number of missing skills DESC
    risk_list = list(projects_at_risk.values())
    risk_list.sort(key=lambda x: len(x["critical_missing_skills"]), reverse=True)

    # 6. Generate "Ideal Candidate Profiles" to hire
    recommended_hires = []
    
    # We can group missing skills by project to create targeted hiring profiles.
    for p_name, data in projects_at_risk.items():
        missing_skills = data["critical_missing_skills"]
        
        # Generate a simple role title based on the primary skill
        primary_skill = missing_skills[0] if missing_skills else "General"
        
        lower_skill = primary_skill.lower()
        if any(word in lower_skill for word in ["sql", "data", "analytics", "db", "business"]):
            role_suffix = " Analyst"
        elif any(word in lower_skill for word in ["manage", "agile", "scrum", "project"]):
            role_suffix = " Manager"
        elif any(word in lower_skill for word in ["design", "ui", "ux", "figma"]):
            role_suffix = " Designer"
        else:
            role_suffix = ""
            
        role_title = f"{primary_skill}{role_suffix}"
        
        recommended_hires.append({
            "role_title": role_title,
            "target_project": p_name,
            "required_skills": list(set(missing_skills)),
            "why": f"This candidate is needed to unblock development on '{p_name}', which is currently stalled due to a lack of available workforce with expertise in {', '.join(missing_skills)}."
        })
        
    # Sort by number of skills desc
    recommended_hires.sort(key=lambda x: -len(x["required_skills"]))

    return {
        "top_missing_skills": results[:15], # Top 15 critical skills needed
        "projects_at_risk": risk_list[:10],  # Top 10 projects at risk
        "recommended_hires": recommended_hires[:10] # Top 10 hires to make
    }

class RequisitionRequest(BaseModel):
    organizationId: str
    role_title: str
    target_project: str
    required_skills: list[str]
    why: str
    openings: int = 1

@router.post("/requisition")
async def create_requisition(req: RequisitionRequest):
    """
    Creates a new job requisition in the database based on a Recommended Hire profile.
    """
    req_id = await create_job_requisition(req.dict())
    return {"status": "success", "requisition_id": req_id}

"""
routers/team_formation.py — FastAPI router for team formation

Endpoints:
  POST /team/recommend               — Score + greedy-select for custom requirements
  GET  /team/recommend/{project_id}  — Auto-fetch project from MongoDB & recommend
  GET  /team/greedy/{project_id}     — Greedy-only result with full selection log

Algorithm:
  1. Score all employees (Cosine Similarity + 7 ER diagram factors)
  2. Sort by score DESC
  3. Greedy Set-Cover selection:
       → Pick highest-ranked candidate IF they add new required skills
       → Skip if no new skills contributed
       → Fallback fill remaining slots by score if needed
  4. Calculate Optimal Allocation % (proportional to score)
  5. Return team + skill coverage report + selection log
"""

from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any

from db.mongo import fetch_employees_with_skills, fetch_project, fetch_skill_ids, fetch_busy_employee_ids
from services.scorer import score_employees
from services.greedy_selector import greedy_select

router = APIRouter(prefix="/team", tags=["Team Formation"])


# ── Request models ─────────────────────────────────────────────────────────

class RequiredSkillIn(BaseModel):
    skill_id: Optional[str] = None
    skill_name: Optional[str] = None
    weight: float = Field(default=50.0, ge=0, le=100)
    priority: str = Field(default="Must-have")
    minimum_experience: int = Field(default=0, ge=0)


class RecommendRequest(BaseModel):
    organization_id: str
    team_size: int = Field(default=5, ge=1, le=50)
    required_skills: list[RequiredSkillIn] = []
    exclude_unavailable: bool = False
    seniority_mix: Optional[dict] = None


# ── Helpers ────────────────────────────────────────────────────────────────

async def _resolve_skills(org_id: str, required_skills_in: list) -> list[dict]:
    """Resolve skill_name → skill_id and return normalized skill dicts."""
    names_needing_id = [
        rs.skill_name for rs in required_skills_in
        if rs.skill_name
    ]
    name_to_id: dict[str, str] = {}
    if names_needing_id:
        name_to_id = await fetch_skill_ids(org_id, names_needing_id)

    return [
        {
            "skill_id":  name_to_id.get(rs.skill_name or "", "") or rs.skill_id,
            "skill_name": rs.skill_name or "",
            "weight":    rs.weight,
            "priority":  rs.priority,
            "minimum_experience": rs.minimum_experience,
        }
        for rs in required_skills_in
    ]


def _project_skill_dicts(required_skills_raw: list, name_to_id: dict[str, str]) -> list[dict]:
    result = [
        {
            "skill_id":  name_to_id.get(rs.get("skillName", ""), "") or rs.get("skillId", ""),
            "skill_name": rs.get("skillName", ""),
            "weight":    rs.get("weight", 50),
            "priority":  rs.get("priority", "Must-have"),
            "minimum_experience": rs.get("minimumExperience", 0),
        }
        for rs in required_skills_raw
    ]
    return result


def _build_response(
    scored: list[dict],
    greedy_result: dict,
    team_size: int,
) -> dict:
    """Build the unified response combining scoring + greedy results."""
    greedy_team = greedy_result["greedy_team"]

    # Mark greedy-selected candidates in the all_candidates list
    greedy_ids = {m["id"] for m in greedy_team}
    for c in scored:
        c["greedy_selected"] = c["id"] in greedy_ids

    return {
        "team_size_requested":  team_size,
        "total_candidates":     len(scored),
        # Greedy team (final recommended team per flowchart)
        "recommended_team":     greedy_team,
        # Full ranked list for "show all" toggle
        "all_candidates":       scored,
        # Greedy metadata
        "skill_coverage":       greedy_result["skill_coverage"],
        "total_skills_covered": greedy_result["total_skills_covered"],
        "total_skills_required":greedy_result["total_skills_required"],
        "uncovered_skills":     greedy_result["uncovered_skills"],
        "fallback_used":        greedy_result["fallback_used"],
        "selection_log":        greedy_result["selection_log"],
        "skipped_candidates":   [
            {"id": s["id"], "name": s["name"], "score": s["final_score"],
             "skip_reason": s.get("skip_reason", "")}
            for s in greedy_result["skipped_candidates"]
        ],
        "algorithm": (
            "MARGINAL UTILITY MAXIMIZATION + Cosine Similarity Scoring\n"
            "Step 1: Score all employees — Cosine Sim (40%) + Workload-Penalized Availability (20%) + "
            "Performance (15%) + Communication (8%) + Teamwork (7%) + "
            "Experience (5%) + Error Rate (3%) + Client Feedback (2%)\n"
            "Step 2: Sort by score DESC\n"
            "Step 3: Marginal Utility optimization — iteratively select candidates who add the most "
            "cumulative proficiency depth to under-represented required skills\n"
            "Step 4: Fallback fill remaining slots by score if needed\n"
            "Step 5: Calculate optimal allocation % proportional to score"
        ),
    }


# ── POST /team/recommend ───────────────────────────────────────────────────

@router.post("/recommend")
async def recommend_team(payload: RecommendRequest) -> Any:
    """
    Score all employees + run greedy skill-balanced selection.
    Returns recommended_team (greedy), all_candidates (scored), skill coverage.
    """
    required_skills_dicts = await _resolve_skills(payload.organization_id, payload.required_skills)

    # Collect resolved skill IDs for stack-aware feedback filtering
    resolved_skill_ids = [rs["skill_id"] for rs in required_skills_dicts if rs.get("skill_id")]

    employees = await fetch_employees_with_skills(payload.organization_id, required_skill_ids=resolved_skill_ids)

    # Step 1–2: Score + rank
    scored = score_employees(
        employees=employees,
        required_skills=required_skills_dicts,
        team_size=payload.team_size,
        exclude_unavailable=payload.exclude_unavailable,
        seniority_mix=payload.seniority_mix,
    )

    # Step 3–5: Greedy selection
    greedy_result = greedy_select(
        scored_candidates=scored,
        required_skills=required_skills_dicts,
        team_size=payload.team_size,
    )

    return _build_response(scored, greedy_result, payload.team_size)


# ── GET /team/recommend/{project_id} ──────────────────────────────────────

@router.get("/recommend/{project_id}")
async def recommend_team_for_project(
    project_id: str,
    organization_id: str,
    exclude_unavailable: bool = False,
) -> Any:
    """
    Auto-fetch project from MongoDB and run greedy team recommendation.
    """
    project = await fetch_project(project_id)
    if not project:
        raise HTTPException(404, f"Project {project_id} not found")

    team_size = project.get("teamPreferences", {}).get("teamSize", 5)
    seniority_mix = project.get("teamPreferences", {}).get("seniorityMix", None)
    required_skills_raw = project.get("requiredSkills", [])

    # Resolve skill names → IDs
    names_needing_id = [
        rs.get("skillName", "") for rs in required_skills_raw
        if rs.get("skillName")
    ]
    name_to_id: dict[str, str] = {}
    if names_needing_id:
        name_to_id = await fetch_skill_ids(organization_id, names_needing_id)

    required_skills_dicts = _project_skill_dicts(required_skills_raw, name_to_id)

    # Collect resolved skill IDs for stack-aware feedback filtering
    resolved_skill_ids = [rs["skill_id"] for rs in required_skills_dicts if rs.get("skill_id")]

    employees = await fetch_employees_with_skills(organization_id, required_skill_ids=resolved_skill_ids)
    if not employees:
        raise HTTPException(404, "No employees found for this organization")

    # Fix #6: guard against team_size = 0 or negative
    if team_size < 1:
        team_size = 5 # Default to 5 if 0 to allow analysis

    # ── Temporal Availability Filter ────────────────────────────────────
    # Fix #1: Fetch employees' total booked % for overlapping date range.
    # Fix #2: Exclude THIS project's own allocations from the busy list.
    # Fix #4: Timezone normalization is handled inside fetch_busy_employee_ids.
    proj_start = project.get("start_date") or project.get("deadline")
    proj_end   = project.get("end_date") or project.get("deadline")
    booked_map: dict[str, float] = await fetch_busy_employee_ids(
        proj_start, proj_end, exclude_project_id=project_id
    )

    if booked_map:
        for emp in employees:
            eid = emp["id"]
            booked_pct = booked_map.get(eid, 0.0)
            if booked_pct >= 100.0:
                # Fully booked → mark Unavailable
                emp["_original_availability"] = emp.get("availability_status")
                emp["availability_status"] = "Unavailable"
            elif booked_pct > 0.0:
                # Partially booked → inject booked_pct so _calc_availability
                # computes real remaining capacity instead of status-based guess
                emp["_booked_pct"] = booked_pct

    # Apply exclude_unavailable filter AFTER override so User setting is respected
    if exclude_unavailable:
        employees = [e for e in employees if e.get("availability_status") != "Unavailable"]

    # Step 1–2: Score + rank
    scored = score_employees(
        employees=employees,
        required_skills=required_skills_dicts,
        team_size=team_size,
        exclude_unavailable=False,  # already filtered above
        seniority_mix=seniority_mix,
    )

    # Step 3–5: Greedy selection
    greedy_result = greedy_select(
        scored_candidates=scored,
        required_skills=required_skills_dicts,
        team_size=team_size,
    )

    return _build_response(scored, greedy_result, team_size)

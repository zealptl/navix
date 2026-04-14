from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db

router = APIRouter(prefix="/api/stars", tags=["stars"])


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class StarSummary(BaseModel):
    id: int
    proper_name: Optional[str]
    bayer_name: Optional[str]
    x: float
    y: float
    z: float
    distance_ly: float
    spectral_type: Optional[str]
    magnitude: Optional[float]
    is_famous: bool
    famous_rank: Optional[int]
    blurb: Optional[str]


class StarDetail(BaseModel):
    id: int
    proper_name: Optional[str]
    bayer_name: Optional[str]
    x: float
    y: float
    z: float
    distance_pc: float
    distance_ly: float
    spectral_type: Optional[str]
    magnitude: Optional[float]
    abs_magnitude: Optional[float]
    is_famous: bool
    famous_rank: Optional[int]
    blurb: Optional[str]


class FamousStar(BaseModel):
    id: int
    proper_name: Optional[str]
    bayer_name: Optional[str]
    x: float
    y: float
    z: float
    distance_ly: float
    spectral_type: Optional[str]
    magnitude: Optional[float]
    is_famous: bool
    famous_rank: int
    blurb: Optional[str]


class NearbyStar(BaseModel):
    id: int
    proper_name: Optional[str]
    bayer_name: Optional[str]
    x: float
    y: float
    z: float
    distance_ly: float
    spectral_type: Optional[str]
    magnitude: Optional[float]
    is_famous: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _row_to_dict(row) -> dict:
    return dict(row._mapping)


# ---------------------------------------------------------------------------
# GET /api/stars/famous
# ---------------------------------------------------------------------------

@router.get("/famous", response_model=list[FamousStar])
def get_famous_stars(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT id, proper_name, bayer_name, x, y, z,
                   distance_ly, spectral_type, magnitude, is_famous, famous_rank, blurb
            FROM stars
            WHERE is_famous = 1
            ORDER BY famous_rank ASC
        """)
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


# ---------------------------------------------------------------------------
# GET /api/stars/search?q=
# ---------------------------------------------------------------------------

@router.get("/search", response_model=list[StarSummary])
def search_stars(
    q: str = Query(default=""),
    db: Session = Depends(get_db),
):
    if not q.strip():
        return []

    pattern = f"%{q.strip()}%"
    rows = db.execute(
        text("""
            SELECT id, proper_name, bayer_name, x, y, z,
                   distance_ly, spectral_type, magnitude,
                   is_famous, famous_rank, blurb
            FROM stars
            WHERE proper_name ILIKE :pattern OR bayer_name ILIKE :pattern
            ORDER BY distance_ly
            LIMIT 20
        """),
        {"pattern": pattern},
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


# ---------------------------------------------------------------------------
# GET /api/stars/nearby?ly=
# ---------------------------------------------------------------------------

@router.get("/nearby", response_model=list[NearbyStar])
def get_nearby_stars(
    ly: float = Query(..., gt=0, description="Maximum distance in light-years"),
    limit: int = Query(default=5000, ge=1, le=50000, description="Max number of stars to return"),
    max_mag: Optional[float] = Query(default=None, description="Only return stars with magnitude <= this value"),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT id, proper_name, bayer_name, x, y, z,
                   distance_ly, spectral_type, magnitude, is_famous
            FROM stars
            WHERE distance_ly <= :ly
              AND (:max_mag IS NULL OR magnitude <= :max_mag OR is_famous = 1)
            ORDER BY distance_ly
            LIMIT :limit
        """),
        {"ly": ly, "limit": limit, "max_mag": max_mag},
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


# ---------------------------------------------------------------------------
# GET /api/stars/{star_id}   — must come last (catches all /{id} paths)
# ---------------------------------------------------------------------------

@router.get("/{star_id}", response_model=StarDetail)
def get_star(star_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("""
            SELECT id, proper_name, bayer_name, x, y, z,
                   distance_pc, distance_ly, spectral_type,
                   magnitude, abs_magnitude, is_famous, famous_rank, blurb
            FROM stars
            WHERE id = :id
        """),
        {"id": star_id},
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Star not found")
    return _row_to_dict(row)

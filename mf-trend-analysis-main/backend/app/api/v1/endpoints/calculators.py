from fastapi import APIRouter, HTTPException

from app.schemas.calculators import (
    LumpsumProjectionRequest,
    LumpsumProjectionResponse,
    MonteCarloRequest,
    MonteCarloResponse,
    RetirementProjectionRequest,
    RetirementProjectionResponse,
    SIPProjectionRequest,
    SIPProjectionResponse,
)
from app.services.calculator_service import CalculatorService
from app.services.monte_carlo_service import MonteCarloService

router = APIRouter(prefix="/calculators", tags=["Calculators"])


@router.post("/sip", response_model=SIPProjectionResponse)
def sip_projection(payload: SIPProjectionRequest):
    return CalculatorService.project_sip(payload)


@router.post("/lumpsum", response_model=LumpsumProjectionResponse)
def lumpsum_projection(payload: LumpsumProjectionRequest):
    return CalculatorService.project_lumpsum(payload)


@router.post("/retirement", response_model=RetirementProjectionResponse)
def retirement_projection(payload: RetirementProjectionRequest):
    try:
        return CalculatorService.project_retirement(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/monte-carlo", response_model=MonteCarloResponse)
def monte_carlo_projection(payload: MonteCarloRequest):
    return MonteCarloService.simulate(payload)

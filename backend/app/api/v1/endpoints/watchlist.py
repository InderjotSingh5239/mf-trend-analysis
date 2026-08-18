import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.database.session import get_db
from app.models.watchlist import Watchlist, WatchlistItem
from app.repositories.watchlist_repository import WatchlistRepository
from app.schemas.watchlist import WatchlistCreate, WatchlistItemCreate, WatchlistItemRead, WatchlistRead

router = APIRouter(prefix="/watchlists", tags=["Watchlist"])


def _get_owned_watchlist(repo: WatchlistRepository, watchlist_id: uuid.UUID, user_id: uuid.UUID) -> Watchlist:
    watchlist = repo.get_watchlist(watchlist_id)
    if watchlist is None or watchlist.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Watchlist not found")
    return watchlist


@router.post("", response_model=WatchlistRead, status_code=status.HTTP_201_CREATED)
def create_watchlist(
    payload: WatchlistCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = WatchlistRepository(db)
    return repo.create_watchlist(user_id, payload.name)


@router.get("", response_model=list[WatchlistRead])
def list_watchlists(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = WatchlistRepository(db)
    return repo.list_watchlists(user_id)


@router.post("/{watchlist_id}/items", response_model=WatchlistItemRead, status_code=status.HTTP_201_CREATED)
def add_watchlist_item(
    watchlist_id: uuid.UUID,
    payload: WatchlistItemCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = WatchlistRepository(db)
    _get_owned_watchlist(repo, watchlist_id, user_id)

    existing = repo.get_item(watchlist_id, payload.fund_id)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Fund already in watchlist")

    item = WatchlistItem(
        watchlist_id=watchlist_id,
        fund_id=payload.fund_id,
        fund_name=payload.fund_name,
        notes=payload.notes,
    )
    return repo.add_item(item)


@router.delete("/{watchlist_id}/items/{fund_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_watchlist_item(
    watchlist_id: uuid.UUID,
    fund_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = WatchlistRepository(db)
    _get_owned_watchlist(repo, watchlist_id, user_id)
    item = repo.get_item(watchlist_id, fund_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found in watchlist")
    repo.remove_item(item)
    return None

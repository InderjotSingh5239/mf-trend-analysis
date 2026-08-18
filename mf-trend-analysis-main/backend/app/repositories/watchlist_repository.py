import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.watchlist import Watchlist, WatchlistItem


class WatchlistRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_watchlist(self, user_id: uuid.UUID, name: str) -> Watchlist:
        watchlist = Watchlist(user_id=user_id, name=name)
        self.db.add(watchlist)
        self.db.commit()
        self.db.refresh(watchlist)
        return watchlist

    def get_watchlist(self, watchlist_id: uuid.UUID) -> Watchlist | None:
        return self.db.get(Watchlist, watchlist_id)

    def list_watchlists(self, user_id: uuid.UUID) -> list[Watchlist]:
        stmt = select(Watchlist).where(Watchlist.user_id == user_id)
        return list(self.db.execute(stmt).scalars().all())

    def add_item(self, item: WatchlistItem) -> WatchlistItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def remove_item(self, item: WatchlistItem) -> None:
        self.db.delete(item)
        self.db.commit()

    def get_item(self, watchlist_id: uuid.UUID, fund_id: uuid.UUID) -> WatchlistItem | None:
        stmt = select(WatchlistItem).where(
            WatchlistItem.watchlist_id == watchlist_id, WatchlistItem.fund_id == fund_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

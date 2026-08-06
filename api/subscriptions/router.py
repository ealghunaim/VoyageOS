"""What tier am I on, and how much of it have I used."""
from fastapi import APIRouter, Depends

from api.core.auth import current_user_id
from api.core.db import get_db
from api.subscriptions import service

router = APIRouter(prefix="/v1/subscription", tags=["subscription"])


@router.get("")
def my_subscription(user_id: str = Depends(current_user_id)):
    """Everything a paywall needs, including the rung above.

    Safe to call before a subscription exists — a user with no row reads as
    free, which is what they are.
    """
    return service.summary(get_db(), user_id)

"""
Financial HQ Routes: Accounts, transactions, portfolio, and dashboard.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, delete

from app.database import get_db
from app.models import FinancialAccount, Transaction, PortfolioPosition, UserProfile

router = APIRouter(prefix="/api/financial", tags=["financial"])


# ── Request Schemas ──

class AccountCreate(BaseModel):
    name: str
    account_type: str
    balance: float = 0.0
    target: Optional[float] = None
    target_date: Optional[str] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[str] = None
    balance: Optional[float] = None
    target: Optional[float] = None
    target_date: Optional[str] = None


class TransactionCreate(BaseModel):
    account_id: int
    amount: float
    category: str
    description: Optional[str] = None
    date: Optional[str] = None


class PositionCreate(BaseModel):
    ticker: str
    shares: float
    avg_cost: float


# ── Helper ──

def _account_dict(a: FinancialAccount) -> dict:
    return {
        "id": a.id,
        "name": a.name,
        "account_type": a.account_type,
        "balance": a.balance,
        "target": a.target,
        "target_date": a.target_date,
        "currency": a.currency,
        "created_at": a.created_at.isoformat(),
        "updated_at": a.updated_at.isoformat(),
    }


def _transaction_dict(t: Transaction) -> dict:
    return {
        "id": t.id,
        "account_id": t.account_id,
        "amount": t.amount,
        "category": t.category,
        "description": t.description,
        "date": t.date.isoformat() if t.date else None,
        "created_at": t.created_at.isoformat(),
    }


def _position_dict(p: PortfolioPosition) -> dict:
    return {
        "id": p.id,
        "ticker": p.ticker,
        "shares": p.shares,
        "avg_cost": p.avg_cost,
        "added_at": p.added_at.isoformat(),
    }


# ── Dashboard ──

@router.get("/dashboard")
async def financial_dashboard(db: AsyncSession = Depends(get_db)):
    """Aggregate financial summary: total balance, tuition progress, recent transactions."""
    # Total balance across all accounts
    result = await db.execute(select(func.sum(FinancialAccount.balance)))
    total_balance = result.scalar() or 0.0

    # Account count
    result = await db.execute(select(func.count(FinancialAccount.id)))
    account_count = result.scalar() or 0

    # Tuition progress from UserProfile
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalar_one_or_none()
    tuition_target = profile.tuition_target if profile else 30000.0
    tuition_deadline = profile.tuition_deadline if profile else "August 2025"

    # Recent transactions (last 10)
    result = await db.execute(
        select(Transaction)
        .order_by(desc(Transaction.date))
        .limit(10)
    )
    recent_transactions = result.scalars().all()

    # Income vs expenses this month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(
            func.sum(Transaction.amount).filter(Transaction.amount > 0),
            func.sum(Transaction.amount).filter(Transaction.amount < 0),
        ).where(Transaction.date >= month_start)
    )
    row = result.one()
    total_income = row[0] or 0.0
    total_expenses = row[1] or 0.0

    return {
        "total_balance": total_balance,
        "account_count": account_count,
        "tuition_target": tuition_target,
        "tuition_deadline": tuition_deadline,
        "tuition_progress": round((total_balance / tuition_target) * 100, 1) if tuition_target > 0 else 0.0,
        "total_income": total_income,
        "total_expenses": abs(total_expenses),
        "recent_transactions": [_transaction_dict(t) for t in recent_transactions],
    }


# ── Accounts ──

@router.get("/accounts")
async def list_accounts(db: AsyncSession = Depends(get_db)):
    """List all financial accounts."""
    result = await db.execute(
        select(FinancialAccount).order_by(desc(FinancialAccount.created_at))
    )
    accounts = result.scalars().all()
    return [_account_dict(a) for a in accounts]


@router.post("/accounts")
async def create_account(data: AccountCreate, db: AsyncSession = Depends(get_db)):
    """Create a new financial account."""
    account = FinancialAccount(
        name=data.name,
        account_type=data.account_type,
        balance=data.balance,
        target=data.target,
        target_date=data.target_date,
    )
    db.add(account)
    await db.flush()
    return _account_dict(account)


@router.put("/accounts/{account_id}")
async def update_account(
    account_id: int,
    data: AccountUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a financial account."""
    result = await db.execute(
        select(FinancialAccount).where(FinancialAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    updates = data.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(account, key, value)
    account.updated_at = datetime.now(timezone.utc)

    await db.flush()
    return _account_dict(account)


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a financial account."""
    result = await db.execute(
        select(FinancialAccount).where(FinancialAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    await db.execute(delete(FinancialAccount).where(FinancialAccount.id == account_id))
    await db.flush()
    return {"deleted": True, "id": account_id}


# ── Transactions ──

@router.get("/transactions")
async def list_transactions(
    account_id: Optional[int] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List transactions, optionally filtered by account_id."""
    query = select(Transaction).order_by(desc(Transaction.date))
    if account_id is not None:
        query = query.where(Transaction.account_id == account_id)
    query = query.limit(limit)

    result = await db.execute(query)
    transactions = result.scalars().all()
    return [_transaction_dict(t) for t in transactions]


@router.post("/transactions")
async def create_transaction(data: TransactionCreate, db: AsyncSession = Depends(get_db)):
    """Create a new transaction."""
    # Validate account exists
    result = await db.execute(
        select(FinancialAccount).where(FinancialAccount.id == data.account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    txn_date = datetime.now(timezone.utc)
    if data.date:
        try:
            txn_date = datetime.fromisoformat(data.date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format.")

    transaction = Transaction(
        account_id=data.account_id,
        amount=data.amount,
        category=data.category,
        description=data.description,
        date=txn_date,
    )
    db.add(transaction)

    # Update account balance
    account.balance += data.amount
    account.updated_at = datetime.now(timezone.utc)

    await db.flush()
    return _transaction_dict(transaction)


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a transaction and reverse its effect on the account balance."""
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Reverse the balance adjustment on the parent account
    acct_result = await db.execute(
        select(FinancialAccount).where(FinancialAccount.id == transaction.account_id)
    )
    account = acct_result.scalar_one_or_none()
    if account:
        account.balance -= transaction.amount
        account.updated_at = datetime.now(timezone.utc)

    await db.execute(delete(Transaction).where(Transaction.id == transaction_id))
    await db.flush()
    return {"deleted": True, "id": transaction_id}


# ── Portfolio ──

@router.get("/portfolio")
async def list_portfolio(db: AsyncSession = Depends(get_db)):
    """List all portfolio positions."""
    result = await db.execute(
        select(PortfolioPosition).order_by(desc(PortfolioPosition.added_at))
    )
    positions = result.scalars().all()
    return [_position_dict(p) for p in positions]


@router.post("/portfolio")
async def add_position(data: PositionCreate, db: AsyncSession = Depends(get_db)):
    """Add a portfolio position."""
    position = PortfolioPosition(
        ticker=data.ticker.upper(),
        shares=data.shares,
        avg_cost=data.avg_cost,
    )
    db.add(position)
    await db.flush()
    return _position_dict(position)


@router.delete("/portfolio/{position_id}")
async def remove_position(position_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a portfolio position."""
    result = await db.execute(
        select(PortfolioPosition).where(PortfolioPosition.id == position_id)
    )
    position = result.scalar_one_or_none()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    await db.execute(delete(PortfolioPosition).where(PortfolioPosition.id == position_id))
    await db.flush()
    return {"deleted": True, "id": position_id}

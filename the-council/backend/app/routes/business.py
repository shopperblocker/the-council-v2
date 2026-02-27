"""
Business Engine Routes: Products, orders, and P&L dashboard.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.database import get_db
from app.models import Product, Order

router = APIRouter(prefix="/api/business", tags=["business"])


# ── Request Schemas ──

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: str
    source_platform: str
    source_price: float
    target_platform: str
    target_price: Optional[float] = None
    estimated_profit: Optional[float] = None
    roi_pct: Optional[float] = None
    status: str = "researching"
    notes: Optional[str] = None
    data: Optional[dict] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    source_platform: Optional[str] = None
    source_price: Optional[float] = None
    target_platform: Optional[str] = None
    target_price: Optional[float] = None
    estimated_profit: Optional[float] = None
    roi_pct: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    data: Optional[dict] = None


class OrderCreate(BaseModel):
    product_id: Optional[int] = None
    platform: str
    order_type: str  # buy or sell
    amount: float
    fees: float = 0.0
    status: str
    tracking: Optional[str] = None


class OrderUpdate(BaseModel):
    platform: Optional[str] = None
    order_type: Optional[str] = None
    amount: Optional[float] = None
    fees: Optional[float] = None
    status: Optional[str] = None
    tracking: Optional[str] = None


# ── Helpers ──

def _product_dict(p: Product) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "sku": p.sku,
        "category": p.category,
        "source_platform": p.source_platform,
        "source_price": p.source_price,
        "target_platform": p.target_platform,
        "target_price": p.target_price,
        "estimated_profit": p.estimated_profit,
        "roi_pct": p.roi_pct,
        "status": p.status,
        "notes": p.notes,
        "data": p.data,
        "created_at": p.created_at.isoformat(),
    }


def _order_dict(o: Order) -> dict:
    return {
        "id": o.id,
        "product_id": o.product_id,
        "platform": o.platform,
        "order_type": o.order_type,
        "amount": o.amount,
        "fees": o.fees,
        "status": o.status,
        "tracking": o.tracking,
        "created_at": o.created_at.isoformat(),
    }


# ── Products ──

@router.get("/products")
async def list_products(db: AsyncSession = Depends(get_db)):
    """List all products."""
    result = await db.execute(
        select(Product).order_by(desc(Product.created_at))
    )
    products = result.scalars().all()
    return [_product_dict(p) for p in products]


@router.post("/products")
async def create_product(data: ProductCreate, db: AsyncSession = Depends(get_db)):
    """Create a new product."""
    product = Product(
        name=data.name,
        sku=data.sku,
        category=data.category,
        source_platform=data.source_platform,
        source_price=data.source_price,
        target_platform=data.target_platform,
        target_price=data.target_price,
        estimated_profit=data.estimated_profit,
        roi_pct=data.roi_pct,
        status=data.status,
        notes=data.notes,
        data=data.data or {},
    )
    db.add(product)
    await db.flush()
    return _product_dict(product)


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a product."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    updates = data.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(product, key, value)

    await db.flush()
    return _product_dict(product)


@router.delete("/products/{product_id}")
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a product."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.delete(product)
    await db.flush()
    return {"deleted": True, "id": product_id}


# ── Orders ──

@router.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List orders, optionally filtered by status."""
    query = select(Order).order_by(desc(Order.created_at))
    if status:
        query = query.where(Order.status == status)
    query = query.limit(limit)

    result = await db.execute(query)
    orders = result.scalars().all()
    return [_order_dict(o) for o in orders]


@router.post("/orders")
async def create_order(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    """Create a new order."""
    # Validate product exists if provided
    if data.product_id:
        result = await db.execute(
            select(Product).where(Product.id == data.product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

    order = Order(
        product_id=data.product_id,
        platform=data.platform,
        order_type=data.order_type,
        amount=data.amount,
        fees=data.fees,
        status=data.status,
        tracking=data.tracking,
    )
    db.add(order)
    await db.flush()
    return _order_dict(order)


@router.put("/orders/{order_id}")
async def update_order(
    order_id: int,
    data: OrderUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an order."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    updates = data.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(order, key, value)

    await db.flush()
    return _order_dict(order)


# ── Dashboard ──

@router.get("/dashboard")
async def business_dashboard(db: AsyncSession = Depends(get_db)):
    """Profit & Loss summary across all business activity."""
    # Total revenue (sell orders)
    result = await db.execute(
        select(func.sum(Order.amount)).where(Order.order_type == "sell")
    )
    total_revenue = result.scalar() or 0.0

    # Total cost (buy orders)
    result = await db.execute(
        select(func.sum(Order.amount)).where(Order.order_type == "buy")
    )
    total_cost = result.scalar() or 0.0

    # Total fees
    result = await db.execute(select(func.sum(Order.fees)))
    total_fees = result.scalar() or 0.0

    # Net profit
    net_profit = total_revenue - total_cost - total_fees

    # Product counts by status
    result = await db.execute(
        select(Product.status, func.count(Product.id)).group_by(Product.status)
    )
    product_status_counts = {row[0]: row[1] for row in result.all()}

    # Order counts by status
    result = await db.execute(
        select(Order.status, func.count(Order.id)).group_by(Order.status)
    )
    order_status_counts = {row[0]: row[1] for row in result.all()}

    # Total products
    result = await db.execute(select(func.count(Product.id)))
    total_products = result.scalar() or 0

    # Total orders
    result = await db.execute(select(func.count(Order.id)))
    total_orders = result.scalar() or 0

    # Average ROI across products that have it set
    result = await db.execute(
        select(func.avg(Product.roi_pct)).where(Product.roi_pct.isnot(None))
    )
    avg_roi = result.scalar()
    avg_roi = round(avg_roi, 1) if avg_roi else None

    # Recent orders (last 10)
    result = await db.execute(
        select(Order).order_by(desc(Order.created_at)).limit(10)
    )
    recent_orders = result.scalars().all()

    return {
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "total_fees": total_fees,
        "net_profit": net_profit,
        "margin_pct": round((net_profit / total_revenue) * 100, 1) if total_revenue > 0 else 0.0,
        "total_products": total_products,
        "total_orders": total_orders,
        "avg_roi_pct": avg_roi,
        "product_status_counts": product_status_counts,
        "order_status_counts": order_status_counts,
        "recent_orders": [_order_dict(o) for o in recent_orders],
    }

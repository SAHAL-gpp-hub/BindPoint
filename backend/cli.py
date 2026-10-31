import asyncio
import sys
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from backend.app.database import AsyncSessionLocal
from backend.app.config import settings
from backend.app.models import Order, Payment, ActivityLog


async def cleanup_retention_files(days: int = settings.FILE_RETENTION_DAYS):
    print(f"[*] Running file retention cleanup for completed orders older than {days} days...")
    cutoff_time = datetime.now(timezone.utc) - timedelta(days=days)

    async with AsyncSessionLocal() as session:
        query = (
            select(Order)
            .options(selectinload(Order.report), selectinload(Order.payments))
            .where(
                and_(
                    Order.print_status == "Completed",
                    Order.completed_at <= cutoff_time,
                )
            )
        )
        result = await session.execute(query)
        completed_orders = result.scalars().all()

        deleted_files = 0
        for order in completed_orders:
            # Delete PDF file
            if order.report and order.report.stored_filename:
                pdf_path = settings.uploads_path / order.report.stored_filename
                if pdf_path.exists():
                    pdf_path.unlink()
                    deleted_files += 1

            # Delete screenshot if exists
            for p in order.payments:
                if p.screenshot_path:
                    sc_path = settings.screenshots_path / p.screenshot_path
                    if sc_path.exists():
                        sc_path.unlink()
                        deleted_files += 1

            # Log cleanup
            session.add(
                ActivityLog(
                    order_id=order.id,
                    actor_type="system",
                    actor_id="retention-cli",
                    from_state="Completed",
                    to_state="Completed (Files Purged)",
                    note=f"Files purged under {days}-day retention policy.",
                )
            )

        await session.commit()
        print(f"[+] Retention cleanup finished: {len(completed_orders)} orders processed, {deleted_files} files removed.")


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "cleanup-files":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else settings.FILE_RETENTION_DAYS
        asyncio.run(cleanup_retention_files(days))
    else:
        print("Usage: python -m backend.cli cleanup-files [days]")


if __name__ == "__main__":
    main()

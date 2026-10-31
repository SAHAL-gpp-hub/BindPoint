"""
Single Source of Truth for Printing Pricing Calculation.

Physical Printing Specification:
  1. First PDF Page: Special paper, single-sided, reverse blank (Cost: special_first_page = ₹10).
  2. Remaining PDF Pages (2 to N): Normal colour duplex printing (Cost: colour_side = ₹5 per side).
  3. Additional Blank Special-Paper Sheet: Inserted at the end, physically blank on both sides (Cost: special_extra_sheet = ₹10).
  4. N must be >= 2.
"""

from dataclasses import dataclass
from decimal import Decimal
import math


@dataclass(frozen=True)
class PricingConfig:
    special_first_page: Decimal = Decimal("10.00")
    special_extra_sheet: Decimal = Decimal("10.00")
    colour_side: Decimal = Decimal("5.00")


DEFAULT_PRICING_CONFIG = PricingConfig()


@dataclass(frozen=True)
class PricingBreakdown:
    total_pages: int
    colour_pages: int
    normal_sheets: int
    special_sheets: int  # Always 2 (first page + extra end sheet)
    printed_sides: int  # 1 (first page) + colour_pages
    blank_sides: int  # 0 or 1 on the last normal duplex sheet
    special_paper_cost: Decimal
    colour_printing_cost: Decimal
    total_amount: Decimal


def calculate_printing_cost(
    pages: int,
    config: PricingConfig = DEFAULT_PRICING_CONFIG,
    unique_paise_offset: Decimal = Decimal("0.00")
) -> PricingBreakdown:
    """
    Pure function to calculate report printing cost and sheet breakdown.
    
    Raises:
        ValueError: If pages < 2 or pages is non-positive.
    """
    if not isinstance(pages, int) or pages < 2:
        raise ValueError("A project report must contain at least 2 pages (first special page + at least one content page).")
    
    colour_pages = pages - 1
    normal_sheets = math.ceil(colour_pages / 2)
    blank_sides = (normal_sheets * 2) - colour_pages  # Exactly 0 (even) or 1 (odd)
    
    special_paper_cost = config.special_first_page + config.special_extra_sheet  # 10 + 10 = 20
    colour_printing_cost = Decimal(colour_pages) * config.colour_side
    
    base_total = special_paper_cost + colour_printing_cost
    total_amount = (base_total + unique_paise_offset).quantize(Decimal("0.01"))
    
    return PricingBreakdown(
        total_pages=pages,
        colour_pages=colour_pages,
        normal_sheets=normal_sheets,
        special_sheets=2,
        printed_sides=1 + colour_pages,
        blank_sides=blank_sides,
        special_paper_cost=special_paper_cost.quantize(Decimal("0.01")),
        colour_printing_cost=colour_printing_cost.quantize(Decimal("0.01")),
        total_amount=total_amount,
    )

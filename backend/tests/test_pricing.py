import pytest
from decimal import Decimal
from backend.app.core.pricing import calculate_printing_cost, PricingConfig


def test_pricing_boundaries_rejected():
    with pytest.raises(ValueError, match="at least 2 pages"):
        calculate_printing_cost(0)
    with pytest.raises(ValueError, match="at least 2 pages"):
        calculate_printing_cost(1)
    with pytest.raises(ValueError, match="at least 2 pages"):
        calculate_printing_cost(-5)


@pytest.mark.parametrize(
    "pages,expected_colour,expected_sheets,expected_blank,expected_total",
    [
        (2, 1, 1, 1, Decimal("25.00")),
        (3, 2, 1, 0, Decimal("30.00")),
        (10, 9, 5, 1, Decimal("65.00")),
        (11, 10, 5, 0, Decimal("70.00")),
        (20, 19, 10, 1, Decimal("115.00")),
        (21, 20, 10, 0, Decimal("120.00")),
        (30, 29, 15, 1, Decimal("165.00")),
        (40, 39, 20, 1, Decimal("215.00")),
        (50, 49, 25, 1, Decimal("265.00")),
    ],
)
def test_pricing_exact_values(pages, expected_colour, expected_sheets, expected_blank, expected_total):
    breakdown = calculate_printing_cost(pages)
    assert breakdown.total_pages == pages
    assert breakdown.colour_pages == expected_colour
    assert breakdown.normal_sheets == expected_sheets
    assert breakdown.special_sheets == 2
    assert breakdown.blank_sides == expected_blank
    assert breakdown.special_paper_cost == Decimal("20.00")
    assert breakdown.colour_printing_cost == Decimal(expected_colour * 5)
    assert breakdown.total_amount == expected_total


def test_pricing_huge_pages():
    huge_n = 5000
    breakdown = calculate_printing_cost(huge_n)
    # 20 + 4999 * 5 = 20 + 24995 = 25015
    assert breakdown.total_amount == Decimal("25015.00")
    assert breakdown.normal_sheets == 2500
    assert breakdown.blank_sides == 1


def test_pricing_with_unique_paise():
    breakdown = calculate_printing_cost(10, unique_paise_offset=Decimal("0.47"))
    assert breakdown.total_amount == Decimal("65.47")

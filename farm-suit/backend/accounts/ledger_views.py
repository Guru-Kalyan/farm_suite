from decimal import Decimal
from django.views.decorators.http import require_http_methods
from utils.response import json_success, json_error
from utils.decorators import api_login_required
from masters.models import Customer, Vendor
from accounts.services.ledger_service import (
    get_customer_ledger,
    get_vendor_ledger,
    get_receivables_prioritization,
    get_payables_prioritization
)

@require_http_methods(["GET"])
@api_login_required
def customer_statement_view(request, customer_id):
    filters = {
        "from_date": request.GET.get("start_date", "").strip() or request.GET.get("from_date", "").strip() or None,
        "to_date": request.GET.get("end_date", "").strip() or request.GET.get("to_date", "").strip() or None,
        "month": request.GET.get("month", "").strip() or None,
        "year": request.GET.get("year", "").strip() or None,
        "outstanding_only": request.GET.get("outstanding_only", "").lower() in ('true', '1'),
        "search": request.GET.get("search", "").strip()
    }
    data = get_customer_ledger(customer_id, filters)
    if not data:
        return json_error("Customer not found", status=404)

    cust = data["customer"]
    cust["name"] = cust["customer_name"]
    cust["code"] = cust["customer_code"]

    summary = data["summary"]
    summary["closing_balance"] = summary["current_receivable_balance"]
    summary["total_debits"] = summary["period_debit"]
    summary["total_credits"] = summary["period_credit"]

    raw_aging = summary.get("aging", {})
    normalized_aging = {
        "0_30_days": raw_aging.get("current_0_30", "0.00"),
        "31_60_days": raw_aging.get("aging_31_60", "0.00"),
        "60_plus_days": raw_aging.get("aging_60_plus", "0.00"),
    }
    data["aging"] = normalized_aging

    for row in data.get("statement", []):
        row["reference_number"] = row.get("reference", "")
        row["transaction_type"] = row.get("type_label", "")
        row["description"] = row.get("notes", "")
        row["balance_sign"] = row.get("balance_type", "")

    return json_success(data)

@require_http_methods(["GET"])
@api_login_required
def customer_ledgers_list_view(request):
    """
    Returns list of all customers with their computed net receivables / wallet balance.
    """
    search = request.GET.get("search", "").strip().lower()
    data = get_receivables_prioritization()
    receivables = data["receivables"]
    if search:
        receivables = [r for r in receivables if search in r["customer_name"].lower() or search in r["customer_code"].lower()]

    normalized = []
    for r in receivables:
        normalized.append({
            **r,
            "id": r["customer_id"],
            "current_balance": r["outstanding_receivable"],
            "total_invoiced": r["total_billed"],
            "last_transaction_date": r["last_payment_date"],
            "transaction_count": r["unpaid_bills_count"],
            "balance_type": "Dr" if Decimal(r["outstanding_receivable"]) > 0 else ("Cr" if Decimal(r["outstanding_receivable"]) < 0 else "—")
        })

    return json_success({
        "portfolio_summary": data["portfolio_summary"],
        "total_receivables": data["portfolio_summary"]["total_receivables"],
        "customers": normalized
    })

@require_http_methods(["GET"])
@api_login_required
def vendor_statement_view(request, vendor_id):
    filters = {
        "from_date": request.GET.get("start_date", "").strip() or request.GET.get("from_date", "").strip() or None,
        "to_date": request.GET.get("end_date", "").strip() or request.GET.get("to_date", "").strip() or None,
        "month": request.GET.get("month", "").strip() or None,
        "year": request.GET.get("year", "").strip() or None,
        "outstanding_only": request.GET.get("outstanding_only", "").lower() in ('true', '1'),
        "search": request.GET.get("search", "").strip()
    }
    data = get_vendor_ledger(vendor_id, filters)
    if not data:
        return json_error("Vendor not found", status=404)

    v = data["vendor"]
    v["name"] = v["vendor_name"]
    v["code"] = v["vendor_code"]

    summary = data["summary"]
    summary["closing_balance"] = summary["current_payable_balance"]
    summary["total_debits"] = summary["period_debit"]
    summary["total_credits"] = summary["period_credit"]

    raw_aging = summary.get("aging", {})
    normalized_aging = {
        "0_30_days": raw_aging.get("current_0_30", "0.00"),
        "31_60_days": raw_aging.get("aging_31_60", "0.00"),
        "60_plus_days": raw_aging.get("aging_60_plus", "0.00"),
    }
    data["aging"] = normalized_aging

    for row in data.get("statement", []):
        row["reference_number"] = row.get("reference", "")
        row["transaction_type"] = row.get("type_label", "")
        row["description"] = row.get("notes", "")
        row["balance_sign"] = row.get("balance_type", "")

    return json_success(data)

@require_http_methods(["GET"])
@api_login_required
def vendor_ledgers_list_view(request):
    """
    Returns list of all vendors with their computed net payables liability.
    """
    search = request.GET.get("search", "").strip().lower()
    data = get_payables_prioritization()
    payables = data["payables"]
    if search:
        payables = [p for p in payables if search in p["vendor_name"].lower() or search in p["vendor_code"].lower()]

    normalized = []
    for p in payables:
        normalized.append({
            **p,
            "id": p["vendor_id"],
            "current_balance": p["outstanding_payable"],
            "total_procurement": p["total_procured"],
            "last_transaction_date": p["last_payment_date"],
            "bills_count": p["unpaid_bills_count"],
            "balance_type": "Cr" if Decimal(p["outstanding_payable"]) > 0 else ("Dr" if Decimal(p["outstanding_payable"]) < 0 else "—")
        })

    return json_success({
        "portfolio_summary": data["portfolio_summary"],
        "total_payables": data["portfolio_summary"]["total_payables"],
        "vendors": normalized
    })

@require_http_methods(["GET"])
@api_login_required
def receivables_prioritization_view(request):
    data = get_receivables_prioritization()
    receivables = data["receivables"]
    aging_totals = {
        "0_30_days": sum(Decimal(r["aging_0_30"]) for r in receivables),
        "31_60_days": sum(Decimal(r["aging_31_60"]) for r in receivables),
        "60_plus_days": sum(Decimal(r["aging_60_plus"]) for r in receivables),
    }
    normalized_customers = []
    for r in receivables:
        normalized_customers.append({
            **r,
            "id": r["customer_id"],
            "outstanding_balance": r["outstanding_receivable"],
            "oldest_unpaid_bill_date": r["oldest_unpaid_date"],
            "aging": {
                "0_30_days": r["aging_0_30"],
                "31_60_days": r["aging_31_60"],
                "60_plus_days": r["aging_60_plus"],
            }
        })
    return json_success({
        "portfolio_summary": data["portfolio_summary"],
        "total_receivables": data["portfolio_summary"]["total_receivables"],
        "aging_totals": {k: str(v) for k, v in aging_totals.items()},
        "customers": normalized_customers,
        "receivables": normalized_customers
    })

@require_http_methods(["GET"])
@api_login_required
def payables_prioritization_view(request):
    data = get_payables_prioritization()
    payables = data["payables"]
    aging_totals = {
        "0_30_days": sum(Decimal(p["aging_0_30"]) for p in payables),
        "31_60_days": sum(Decimal(p["aging_31_60"]) for p in payables),
        "60_plus_days": sum(Decimal(p["aging_60_plus"]) for p in payables),
    }
    normalized_vendors = []
    for p in payables:
        normalized_vendors.append({
            **p,
            "id": p["vendor_id"],
            "outstanding_balance": p["outstanding_payable"],
            "oldest_unpaid_bill_date": p["oldest_unpaid_date"],
            "aging": {
                "0_30_days": p["aging_0_30"],
                "31_60_days": p["aging_31_60"],
                "60_plus_days": p["aging_60_plus"],
            }
        })
    return json_success({
        "portfolio_summary": data["portfolio_summary"],
        "total_payables": data["portfolio_summary"]["total_payables"],
        "aging_totals": {k: str(v) for k, v in aging_totals.items()},
        "vendors": normalized_vendors,
        "payables": normalized_vendors
    })


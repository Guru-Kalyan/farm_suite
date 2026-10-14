import datetime
from decimal import Decimal
from django.db.models import Sum, Q
from django.utils import timezone
from masters.models import Customer, Vendor
from sales.models import SalesBill, SalesPayment
from trading.models import PurchaseBill, VendorPayment
from orders.models import Order, OrderAdvance

def get_customer_ledger(customer_id, filters=None):
    filters = filters or {}
    try:
        customer = Customer.objects.get(pk=customer_id)
    except Customer.DoesNotExist:
        return None

    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    month = filters.get("month")
    year = filters.get("year")
    outstanding_only = filters.get("outstanding_only", False)
    search = filters.get("search", "").strip().lower()

    # 1. Fetch all posted SalesBills for customer
    bills_qs = SalesBill.objects.filter(customer=customer, status='POSTED')
    # 2. Fetch all SalesPayments for customer
    payments_qs = SalesPayment.objects.filter(customer=customer)
    # 3. Fetch unfulfilled OrderAdvances for customer (not yet transferred to bill)
    advances_qs = OrderAdvance.objects.filter(
        order__customer=customer,
        order__fulfilled_sales_bill__isnull=True
    ).exclude(order__status='CANCELLED')

    today = timezone.now().date()

    # Build raw transaction list
    raw_txns = []

    for b in bills_qs:
        raw_txns.append({
            "id": f"bill_{b.id}",
            "doc_id": b.id,
            "date": b.bill_date,
            "type": "SALES_BILL",
            "type_label": f"Sales Invoice ({b.get_sale_type_display()})",
            "reference": b.bill_number,
            "debit": b.grand_total,
            "credit": Decimal('0.00'),
            "payment_status": b.payment_status,
            "bill_total": b.grand_total,
            "bill_paid": b.amount_paid,
            "bill_balance": b.remaining_balance,
            "notes": b.remarks or "",
            "is_bill": True
        })

    for p in payments_qs:
        raw_txns.append({
            "id": f"pay_{p.id}",
            "doc_id": p.id,
            "date": p.payment_date,
            "type": "PAYMENT_RECEIVED",
            "type_label": f"Payment Received ({p.get_payment_method_display()})",
            "reference": p.reference_number or f"PAY-{p.id}",
            "debit": Decimal('0.00'),
            "credit": p.amount,
            "payment_status": "N/A",
            "bill_total": Decimal('0.00'),
            "bill_paid": Decimal('0.00'),
            "bill_balance": Decimal('0.00'),
            "notes": f"Applied to Bill {p.sales_bill.bill_number}. {p.notes}".strip(),
            "is_bill": False
        })

    for a in advances_qs:
        raw_txns.append({
            "id": f"adv_{a.id}",
            "doc_id": a.id,
            "date": a.payment_date,
            "type": "ORDER_ADVANCE",
            "type_label": f"Order Advance ({a.get_payment_method_display()})",
            "reference": a.reference_number or f"ADV-{a.order.order_number}",
            "debit": Decimal('0.00'),
            "credit": a.amount,
            "payment_status": "N/A",
            "bill_total": Decimal('0.00'),
            "bill_paid": Decimal('0.00'),
            "bill_balance": Decimal('0.00'),
            "notes": f"Advance deposit for Order {a.order.order_number}. {a.notes}".strip(),
            "is_bill": False
        })

    # Sort strictly chronologically by date
    raw_txns.sort(key=lambda x: (x["date"], x["id"]))

    # Calculate overall lifetime totals & aging
    total_sales_value = sum(t["debit"] for t in raw_txns)
    total_received_value = sum(t["credit"] for t in raw_txns)
    net_receivable_balance = total_sales_value - total_received_value

    aging_0_30 = Decimal('0.00')
    aging_31_60 = Decimal('0.00')
    aging_60_plus = Decimal('0.00')
    oldest_unpaid_date = None

    for t in raw_txns:
        if t["is_bill"] and t["bill_balance"] > Decimal('0.00'):
            days_old = (today - t["date"]).days
            bal = t["bill_balance"]
            if not oldest_unpaid_date or t["date"] < oldest_unpaid_date:
                oldest_unpaid_date = t["date"]

            if days_old <= 30:
                aging_0_30 += bal
            elif days_old <= 60:
                aging_31_60 += bal
            else:
                aging_60_plus += bal

    # Compute opening balance if filtering by date
    opening_balance = Decimal('0.00')
    filtered_txns = []

    for t in raw_txns:
        t_date_str = str(t["date"])
        # If transaction is strictly before from_date, accumulate into opening_balance
        if from_date and t_date_str < str(from_date):
            opening_balance += (t["debit"] - t["credit"])
            continue

        # Check filter bounds
        if to_date and t_date_str > str(to_date):
            continue
        if month and t["date"].month != int(month):
            continue
        if year and t["date"].year != int(year):
            continue
        if outstanding_only and (not t["is_bill"] or t["bill_balance"] <= Decimal('0.00')):
            continue
        if search:
            match = (search in t["reference"].lower() or
                     search in t["type_label"].lower() or
                     search in t["notes"].lower())
            if not match:
                continue

        filtered_txns.append(t)

    # Compute running balances across the filtered statement
    running = opening_balance
    statement_rows = []
    period_debit = Decimal('0.00')
    period_credit = Decimal('0.00')

    for t in filtered_txns:
        running += (t["debit"] - t["credit"])
        period_debit += t["debit"]
        period_credit += t["credit"]

        bal_type = "Dr" if running > 0 else ("Cr" if running < 0 else "—")
        statement_rows.append({
            "id": t["id"],
            "doc_id": t["doc_id"],
            "date": t["date"],
            "reference": t["reference"],
            "type": t["type"],
            "type_label": t["type_label"],
            "debit": str(t["debit"]),
            "credit": str(t["credit"]),
            "running_balance": str(abs(running)),
            "balance_type": bal_type,
            "signed_balance": str(running),
            "payment_status": t["payment_status"],
            "bill_balance": str(t["bill_balance"]),
            "notes": t["notes"],
            "is_bill": t["is_bill"]
        })

    return {
        "customer": {
            "id": customer.id,
            "customer_name": customer.customer_name,
            "customer_code": customer.customer_code,
            "phone": customer.phone,
            "email": customer.email,
            "address": customer.address,
            "gst_number": customer.gst_number
        },
        "summary": {
            "total_sales_value": str(total_sales_value),
            "total_received_value": str(total_received_value),
            "current_receivable_balance": str(net_receivable_balance),
            "balance_type": "Dr" if net_receivable_balance > 0 else ("Cr" if net_receivable_balance < 0 else "—"),
            "opening_balance": str(opening_balance),
            "opening_balance_type": "Dr" if opening_balance > 0 else ("Cr" if opening_balance < 0 else "—"),
            "period_debit": str(period_debit),
            "period_credit": str(period_credit),
            "period_net": str(period_debit - period_credit),
            "transaction_count": len(raw_txns),
            "first_transaction_date": raw_txns[0]["date"] if raw_txns else None,
            "latest_transaction_date": raw_txns[-1]["date"] if raw_txns else None,
            "aging": {
                "current_0_30": str(aging_0_30),
                "aging_31_60": str(aging_31_60),
                "aging_60_plus": str(aging_60_plus),
                "oldest_unpaid_bill_date": oldest_unpaid_date
            }
        },
        "statement": statement_rows
    }


def get_vendor_ledger(vendor_id, filters=None):
    filters = filters or {}
    try:
        vendor = Vendor.objects.get(pk=vendor_id)
    except Vendor.DoesNotExist:
        return None

    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    month = filters.get("month")
    year = filters.get("year")
    outstanding_only = filters.get("outstanding_only", False)
    search = filters.get("search", "").strip().lower()

    # 1. Fetch all posted PurchaseBills
    bills_qs = PurchaseBill.objects.filter(vendor=vendor, status='POSTED')
    # 2. Fetch all VendorPayments
    payments_qs = VendorPayment.objects.filter(vendor=vendor)

    today = timezone.now().date()

    raw_txns = []

    for b in bills_qs:
        raw_txns.append({
            "id": f"vbill_{b.id}",
            "doc_id": b.id,
            "date": b.bill_date,
            "type": "PURCHASE_BILL",
            "type_label": f"Purchase Bill (Landed: ₹{b.total_landed_cost})",
            "reference": b.bill_number,
            "debit": Decimal('0.00'),
            "credit": b.grand_total,  # Increases liability owed to vendor
            "payment_status": b.payment_status,
            "bill_total": b.grand_total,
            "bill_paid": b.amount_paid,
            "bill_balance": b.remaining_balance,
            "notes": b.remarks or "",
            "is_bill": True
        })

    for p in payments_qs:
        raw_txns.append({
            "id": f"vpay_{p.id}",
            "doc_id": p.id,
            "date": p.payment_date,
            "type": "VENDOR_PAYMENT",
            "type_label": f"Vendor Payment ({p.get_payment_method_display()})",
            "reference": p.reference_number or f"VPAY-{p.id}",
            "debit": p.amount,  # Reduces liability owed to vendor
            "credit": Decimal('0.00'),
            "payment_status": "N/A",
            "bill_total": Decimal('0.00'),
            "bill_paid": Decimal('0.00'),
            "bill_balance": Decimal('0.00'),
            "notes": f"Payment on Purchase Bill {p.purchase_bill.bill_number}. {p.notes}".strip(),
            "is_bill": False
        })

    raw_txns.sort(key=lambda x: (x["date"], x["id"]))

    total_procure_value = sum(t["credit"] for t in raw_txns)
    total_paid_value = sum(t["debit"] for t in raw_txns)
    net_payable_balance = total_procure_value - total_paid_value

    aging_0_30 = Decimal('0.00')
    aging_31_60 = Decimal('0.00')
    aging_60_plus = Decimal('0.00')
    oldest_unpaid_date = None

    for t in raw_txns:
        if t["is_bill"] and t["bill_balance"] > Decimal('0.00'):
            days_old = (today - t["date"]).days
            bal = t["bill_balance"]
            if not oldest_unpaid_date or t["date"] < oldest_unpaid_date:
                oldest_unpaid_date = t["date"]

            if days_old <= 30:
                aging_0_30 += bal
            elif days_old <= 60:
                aging_31_60 += bal
            else:
                aging_60_plus += bal

    opening_balance = Decimal('0.00')
    filtered_txns = []

    for t in raw_txns:
        t_date_str = str(t["date"])
        if from_date and t_date_str < str(from_date):
            opening_balance += (t["credit"] - t["debit"])
            continue

        if to_date and t_date_str > str(to_date):
            continue
        if month and t["date"].month != int(month):
            continue
        if year and t["date"].year != int(year):
            continue
        if outstanding_only and (not t["is_bill"] or t["bill_balance"] <= Decimal('0.00')):
            continue
        if search:
            match = (search in t["reference"].lower() or
                     search in t["type_label"].lower() or
                     search in t["notes"].lower())
            if not match:
                continue

        filtered_txns.append(t)

    running = opening_balance
    statement_rows = []
    period_debit = Decimal('0.00')
    period_credit = Decimal('0.00')

    for t in filtered_txns:
        running += (t["credit"] - t["debit"])
        period_debit += t["debit"]
        period_credit += t["credit"]

        bal_type = "Cr" if running > 0 else ("Dr" if running < 0 else "—")
        statement_rows.append({
            "id": t["id"],
            "doc_id": t["doc_id"],
            "date": t["date"],
            "reference": t["reference"],
            "type": t["type"],
            "type_label": t["type_label"],
            "debit": str(t["debit"]),
            "credit": str(t["credit"]),
            "running_balance": str(abs(running)),
            "balance_type": bal_type,
            "signed_balance": str(running),
            "payment_status": t["payment_status"],
            "bill_balance": str(t["bill_balance"]),
            "notes": t["notes"],
            "is_bill": t["is_bill"]
        })

    return {
        "vendor": {
            "id": vendor.id,
            "vendor_name": vendor.vendor_name,
            "vendor_code": vendor.vendor_code,
            "phone": vendor.phone,
            "email": vendor.email,
            "address": vendor.address,
            "gst_number": vendor.gst_number
        },
        "summary": {
            "total_procurement_value": str(total_procure_value),
            "total_amount_paid": str(total_paid_value),
            "current_payable_balance": str(net_payable_balance),
            "balance_type": "Cr" if net_payable_balance > 0 else ("Dr" if net_payable_balance < 0 else "—"),
            "opening_balance": str(opening_balance),
            "opening_balance_type": "Cr" if opening_balance > 0 else ("Dr" if opening_balance < 0 else "—"),
            "period_debit": str(period_debit),
            "period_credit": str(period_credit),
            "period_net": str(period_credit - period_debit),
            "transaction_count": len(raw_txns),
            "first_transaction_date": raw_txns[0]["date"] if raw_txns else None,
            "latest_transaction_date": raw_txns[-1]["date"] if raw_txns else None,
            "aging": {
                "current_0_30": str(aging_0_30),
                "aging_31_60": str(aging_31_60),
                "aging_60_plus": str(aging_60_plus),
                "oldest_unpaid_bill_date": oldest_unpaid_date
            }
        },
        "statement": statement_rows
    }


def get_receivables_prioritization():
    """
    Computes priority list of customers who owe money to Farm Suit.
    Sorted by highest outstanding receivable descending.
    """
    today = timezone.now().date()
    customers = Customer.objects.filter(is_active=True)
    results = []

    total_receivable_portfolio = Decimal('0.00')
    total_billed_portfolio = Decimal('0.00')
    total_received_portfolio = Decimal('0.00')

    for c in customers:
        posted_bills = SalesBill.objects.filter(customer=c, status='POSTED')
        tot_billed = posted_bills.aggregate(t=Sum('grand_total'))['t'] or Decimal('0.00')
        tot_received = SalesPayment.objects.filter(customer=c).aggregate(t=Sum('amount'))['t'] or Decimal('0.00')

        # Advances not yet applied
        adv_received = OrderAdvance.objects.filter(
            order__customer=c,
            order__fulfilled_sales_bill__isnull=True
        ).exclude(order__status='CANCELLED').aggregate(t=Sum('amount'))['t'] or Decimal('0.00')

        effective_received = tot_received + adv_received
        net_receivable = tot_billed - effective_received

        unpaid_bills = posted_bills.filter(payment_status__in=['UNPAID', 'PARTIALLY_PAID'])
        unpaid_count = unpaid_bills.count()

        aging_0_30 = Decimal('0.00')
        aging_31_60 = Decimal('0.00')
        aging_60_plus = Decimal('0.00')
        oldest_unpaid_date = None

        for b in unpaid_bills:
            bal = b.remaining_balance
            days = (today - b.bill_date).days
            if not oldest_unpaid_date or b.bill_date < oldest_unpaid_date:
                oldest_unpaid_date = b.bill_date

            if days <= 30:
                aging_0_30 += bal
            elif days <= 60:
                aging_31_60 += bal
            else:
                aging_60_plus += bal

        last_payment = SalesPayment.objects.filter(customer=c).order_by('-payment_date').first()

        total_receivable_portfolio += max(Decimal('0.00'), net_receivable)
        total_billed_portfolio += tot_billed
        total_received_portfolio += effective_received

        days_overdue = (today - oldest_unpaid_date).days if oldest_unpaid_date else 0

        results.append({
            "customer_id": c.id,
            "customer_name": c.customer_name,
            "customer_code": c.customer_code,
            "phone": c.phone,
            "total_billed": str(tot_billed),
            "total_received": str(effective_received),
            "outstanding_receivable": str(net_receivable),
            "unpaid_bills_count": unpaid_count,
            "oldest_unpaid_date": oldest_unpaid_date,
            "days_overdue": days_overdue,
            "aging_0_30": str(aging_0_30),
            "aging_31_60": str(aging_31_60),
            "aging_60_plus": str(aging_60_plus),
            "last_payment_date": last_payment.payment_date if last_payment else None
        })

    # Sort descending by outstanding_receivable
    results.sort(key=lambda x: Decimal(x["outstanding_receivable"]), reverse=True)

    return {
        "portfolio_summary": {
            "total_receivables": str(total_receivable_portfolio),
            "total_billed": str(total_billed_portfolio),
            "total_received": str(total_received_portfolio),
            "customers_with_debt": len([r for r in results if Decimal(r["outstanding_receivable"]) > 0]),
            "total_customers": len(results)
        },
        "receivables": results
    }


def get_payables_prioritization():
    """
    Computes priority list of vendors whom Farm Suit owes money.
    Sorted by highest outstanding payable liability descending.
    """
    today = timezone.now().date()
    vendors = Vendor.objects.filter(is_active=True)
    results = []

    total_payable_portfolio = Decimal('0.00')
    total_procured_portfolio = Decimal('0.00')
    total_paid_portfolio = Decimal('0.00')

    for v in vendors:
        posted_bills = PurchaseBill.objects.filter(vendor=v, status='POSTED')
        tot_procured = posted_bills.aggregate(t=Sum('grand_total'))['t'] or Decimal('0.00')
        tot_paid = VendorPayment.objects.filter(vendor=v).aggregate(t=Sum('amount'))['t'] or Decimal('0.00')
        net_payable = tot_procured - tot_paid

        unpaid_bills = posted_bills.filter(payment_status__in=['UNPAID', 'PARTIALLY_PAID'])
        unpaid_count = unpaid_bills.count()

        aging_0_30 = Decimal('0.00')
        aging_31_60 = Decimal('0.00')
        aging_60_plus = Decimal('0.00')
        oldest_unpaid_date = None

        for b in unpaid_bills:
            bal = b.remaining_balance
            days = (today - b.bill_date).days
            if not oldest_unpaid_date or b.bill_date < oldest_unpaid_date:
                oldest_unpaid_date = b.bill_date

            if days <= 30:
                aging_0_30 += bal
            elif days <= 60:
                aging_31_60 += bal
            else:
                aging_60_plus += bal

        last_payment = VendorPayment.objects.filter(vendor=v).order_by('-payment_date').first()

        total_payable_portfolio += max(Decimal('0.00'), net_payable)
        total_procured_portfolio += tot_procured
        total_paid_portfolio += tot_paid

        days_overdue = (today - oldest_unpaid_date).days if oldest_unpaid_date else 0

        results.append({
            "vendor_id": v.id,
            "vendor_name": v.vendor_name,
            "vendor_code": v.vendor_code,
            "phone": v.phone,
            "total_procured": str(tot_procured),
            "total_paid": str(tot_paid),
            "outstanding_payable": str(net_payable),
            "unpaid_bills_count": unpaid_count,
            "oldest_unpaid_date": oldest_unpaid_date,
            "days_overdue": days_overdue,
            "aging_0_30": str(aging_0_30),
            "aging_31_60": str(aging_31_60),
            "aging_60_plus": str(aging_60_plus),
            "last_payment_date": last_payment.payment_date if last_payment else None
        })

    results.sort(key=lambda x: Decimal(x["outstanding_payable"]), reverse=True)

    return {
        "portfolio_summary": {
            "total_payables": str(total_payable_portfolio),
            "total_procured": str(total_procured_portfolio),
            "total_paid": str(total_paid_portfolio),
            "vendors_with_liability": len([r for r in results if Decimal(r["outstanding_payable"]) > 0]),
            "total_vendors": len(results)
        },
        "payables": results
    }

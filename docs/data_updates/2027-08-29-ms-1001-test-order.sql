-- One-time data update: order MS-1001 is a test order (Moses, 18 Nov 2026).
--
-- A sandbox purchase from before Stripe went live: no real money moved. From now on it shows as "Test · not charged"
-- on the player's /purchases page and in the CRM, gets no receipt number, and is left out of sales totals, VAT reports
-- and the bookkeeping exports (payments.TEST_ORDER). This order's row only; nothing else changes.

UPDATE payments SET is_test = true WHERE order_no = 'MS-1001';

SELECT order_no, provider, left(stripe_session_id, 8) AS session, status, is_test,
       (SELECT string_agg(d.number, ', ' ORDER BY d.number) FROM billing_documents d WHERE d.payment_id = payments.id) AS documents
  FROM payments WHERE order_no = 'MS-1001';

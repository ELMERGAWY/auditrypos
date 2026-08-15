# Phase 7 accounting standards sources

## Verified source: IFRS Foundation IAS 2
URL: https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/

The official IFRS Foundation page states that IAS 2 covers determining inventory cost and subsequent recognition as expense, including write-downs to net realisable value. It states that inventories are measured at the lower of cost and net realisable value, where NRV is estimated selling price less costs of completion and sale. It also states that inventory cost includes purchase, conversion, and other costs bringing inventory to present location and condition. For interchangeable items, the permitted cost formulas are FIFO or weighted average; specific identification applies to non-interchangeable items. When sold, carrying amount is recognised as expense in the same period as related revenue, and write-downs/losses are recognised when they occur.

## Egyptian Accounting Standards source
URL: https://fra.gov.eg/en/%D9%85%D8%B9%D8%A7%D9%8A%D9%8A%D8%B1%D8%A7%D9%84%D9%85%D8%AD%D8%A7%D8%B3%D8%A8%D8%A9%D9%88%D9%85%D8%B1%D8%A7%D9%82%D8%A8%D9%8A%D8%A7%D9%84%D8%AD%D8%B3%D8%A7%D8%A8%D8%A7%D8%AA/

The official FRA page was reachable through search discovery but returned "Request Rejected / You are not authorized" in the browser session. Therefore no detailed EAS rule is asserted from that page. The implementation keeps EAS selectable as a company policy label and does not claim legal or tax compliance; final statutory mapping should be reviewed by the company’s Egyptian accountant/auditor.

## Implementation implication
The application should store the selected reporting standard as an explicit company setting, use standards-aware costing controls (disallow LIFO under IFRS/EAS defaults), and expose policy metadata in report output. It should not rewrite historical journals or infer statutory compliance from a selector alone.

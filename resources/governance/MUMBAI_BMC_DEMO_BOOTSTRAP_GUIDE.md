# Mumbai BMC Demo Bootstrap Data Pack v1

**Project:** Local Wellness
**Authority:** Brihanmumbai Municipal Corporation / MCGM
**Source directory date:** 2026-06-18
**Last checked:** 2026-07-16

## Purpose

This pack gives the application enough real BMC governance data to run a **staging/demo complaint-routing flow**:

```text
location / selected ward
→ BMC operational ward office
→ durable ward role
→ current Assistant Commissioner assignment
→ zone Deputy Municipal Commissioner
→ relevant central department
→ BMC central fallback
```

The data is sourced principally from the official **BMC CONNECT 2026** directory and the official BMC website.

## Important activation rule

The records are official-source records, but they are not evidence that BMC has authorized Local Wellness to send or register complaints through every listed phone or email.

Use the data as follows:

- load it into staging;
- create internal government test accounts representing the durable roles;
- route demo complaints to those test accounts;
- display the official contact as reference;
- do not automatically email, call, WhatsApp, or claim official BMC registration;
- keep `production_routable = false` until reviewed and approved.

## Ward model

BMC's long-standing geometry commonly uses 24 lettered administrative wards. CONNECT 2026 exposes 26 operational ward-office units by splitting:

```text
K/E → K/S and K/N
P/N → P/E and P/W
```

If your geometry still contains only legacy K/E and P/N polygons, do not guess the child office. Route to the relevant zone review queue until child polygons or an approved address/PIN crosswalk exists.

## Pack contents

```text
MUMBAI_BMC_DEMO_BOOTSTRAP_DATA_v1.xlsx
csv/
  Authority.csv
  Public_Channels.csv
  Senior_Leadership.csv
  Zones.csv
  Ward_Offices.csv
  Ward_Crosswalk.csv
  Departments.csv
  Complaint_Routing.csv
  Source_Registry.csv
  Activation_Policy.csv
```

## Recommended import order

1. Authority
2. Source Registry
3. Public Channels
4. Zones
5. Ward Offices
6. Ward Crosswalk
7. Departments
8. Senior Leadership / officer assignments
9. Complaint Routing
10. Internal test-account role bindings

## Required role-first treatment

Do not use the person's name as the routing key.

Example:

```text
office = BMC A Ward Office
role = Assistant Commissioner — Ward
current person = Dr Gajanan Bellale
role email = ac.a@mcgm.gov.in
```

When the incumbent changes, close the current assignment and create a new assignment. The office and durable role remain unchanged.

## Demo routing behavior

For a demo complaint:

1. Resolve the geometry to a ward.
2. Resolve the category and asset type.
3. Create an internal assignment to a test user linked to the ward role.
4. Attach the source-backed BMC contact to the routing explanation.
5. Escalate internally to the zone or department test account.
6. Show `Official external submission not yet integrated`.
7. Use `1916` or the official complaint portal as a user-visible fallback.

## Official sources

- BMC CONNECT 2026: https://dm.mcgm.gov.in/assets/pdf/Final%20updated%20Final%20Connect%20Diary%202021.07.07.2021.pdf
- Official BMC website: https://www.mcgm.gov.in/irj/portal/anonymous
- BMC wards/offices map: https://www.mcgm.gov.in/irj/portal/anonymous/BMC-on-Map-Wards-Offices
- BMC complaint portal: https://marg.mcgm.gov.in/

## Verification limitations

- The directory is marked as current on 18 June 2026.
- Individual posting effective dates are generally not supplied.
- Some records are marked in charge/additional charge.
- The official source contains occasional formatting or typographical problems; malformed values are omitted rather than silently corrected.
- Public contact information is not equivalent to permission for automated complaint transmission.

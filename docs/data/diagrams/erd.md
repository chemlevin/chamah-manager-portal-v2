# Draft ERD

Status: Draft architecture diagram.

Last updated: 2026-07-12

## Purpose

This diagram shows the current database blueprint at concept level. The database is not implemented.

```mermaid
erDiagram
  SCHOOL_YEARS {
    uuid school_year_id PK
    text school_year_code
    text display_name
    date start_date
    date end_date
    text status
    text website_visibility
  }

  CALENDAR_YEARS {
    uuid calendar_year_id PK
    text calendar_year_code
    text display_name
    date start_date
    date end_date
    text status
  }

  LEGAL_ENTITY_TYPES {
    uuid legal_entity_type_id PK
    text legal_entity_type_code
    text display_name
    text status
  }

  LEGAL_ENTITIES {
    uuid legal_entity_id PK
    uuid legal_entity_type_id FK
    text legal_entity_code
    text display_name
  }

  ORGANIZATION_UNITS {
    uuid organization_unit_id PK
    uuid parent_organization_unit_id FK
    text organization_unit_code
    text display_name
  }

  DAYCARES {
    uuid daycare_id PK
    uuid organization_unit_id FK
    uuid legal_entity_id FK
    text daycare_code
    text display_name
  }

  CLASSROOMS {
    uuid classroom_id PK
    uuid daycare_id FK
    text classroom_code
    text display_name
  }

  LEGAL_ENTITY_TYPES ||--o{ LEGAL_ENTITIES : classifies
  LEGAL_ENTITIES ||--o{ DAYCARES : owns
  ORGANIZATION_UNITS ||--o{ ORGANIZATION_UNITS : parent
  ORGANIZATION_UNITS ||--o{ DAYCARES : contains
  DAYCARES ||--o{ CLASSROOMS : has
```

## Notes

- Only `school_years` and `calendar_years` are approved concepts.
- `legal_entity_types` is draft.
- Other entities shown are planned or not yet designed.


# Migration Order

Apply in this exact order. Duplicate numbers exist due to parallel development — use this file as source of truth.

```
001 → 049  — base schema (sequential, no duplicates)
050        — agent_route_knowledge
051        — ...
052        — ...
053        — user_agreements
054-059    — ...
060_rafting_tour_kamchatka.sql    ← apply FIRST
060_user_trips_flights.sql        ← apply SECOND
061_user_trips_flight_times.sql
062_octo_reseller_reference.sql
063_agent_learning.sql
064_sales_tracking.sql            ← apply FIRST
064_zone_normalize_user_trips.sql ← apply SECOND
0645_safety_capacity_layer.sql
0646_agent_memory.sql
065_hotfix_missing_columns.sql    ← apply FIRST
065_safety_alerts.sql             ← apply SECOND
066_board_meeting_execution.sql
067_agent_autonomy.sql
068_new_agent_council_members.sql
069_danger_assessments.sql
070_safety_capacity_layer_fix.sql
071-076    — (check migrations/ directory)
077_partner_telegram_chat_id.sql
078_support_tickets.sql
079_channel_manager.sql
080_performance_indexes.sql       ← CONCURRENTLY, no transaction needed
```

## Rules going forward
- Next migration number: **081**
- Never reuse a number
- CONCURRENTLY indexes cannot run inside a transaction — apply separately

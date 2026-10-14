alter table public.cells add constraint measurement_precision check (
  voltage_mv=round(voltage_mv,3) and resistance_mohm=round(resistance_mohm,5) and capacity_mah=round(capacity_mah,3)
);
-- The browser cannot choose status, role, actor, or timestamps on business writes.

// v2: user-confirmed PoC limits. Resistance is retained as an observation, not an approval gate.
export const SOP={version:'JSI-SOP-v2',cellCount:8,requiredDimensions:['voltage_mv','capacity_mah'] as const,dimensions:['voltage_mv','resistance_mohm','capacity_mah'] as const,limits:{voltage_mv:10,resistance_mohm:0.01,capacity_mah:500},scales:[1000,100000,1000]} as const;

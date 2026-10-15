// Immutable v1 contract. A changed production rule requires a new version and SQL parity tests.
export const SOP={version:'JSI-SOP-v1',cellCount:8,dimensions:['voltage_mv','resistance_mohm','capacity_mah'] as const,limits:{voltage_mv:10,resistance_mohm:0.01,capacity_mah:500},scales:[1000,100000,1000]} as const;

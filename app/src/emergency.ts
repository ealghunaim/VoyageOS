// Emergency numbers by country — deterministic data, never AI-generated.
// Sources: national emergency systems; verify locally when it matters most.
export const EMERGENCY: Record<string, { all?: string; police?: string; ambulance?: string }> = {
  KW: { all: '112' }, QA: { all: '999' }, AE: { police: '999', ambulance: '998' },
  SA: { all: '911' }, BH: { all: '999' }, OM: { all: '9999' }, JO: { all: '911' },
  EG: { police: '122', ambulance: '123' }, TR: { all: '112' }, LB: { police: '112', ambulance: '140' },
  GB: { all: '999' }, IE: { all: '112' }, FR: { all: '112' }, DE: { all: '112' },
  IT: { all: '112' }, ES: { all: '112' }, PT: { all: '112' }, NL: { all: '112' },
  BE: { all: '112' }, CH: { all: '112' }, AT: { all: '112' }, SE: { all: '112' },
  NO: { all: '112' }, DK: { all: '112' }, FI: { all: '112' }, PL: { all: '112' },
  CZ: { all: '112' }, GR: { all: '112' }, RU: { all: '112' }, UA: { all: '112' },
  US: { all: '911' }, CA: { all: '911' }, MX: { all: '911' }, BR: { police: '190', ambulance: '192' },
  AR: { all: '911' }, CL: { police: '133', ambulance: '131' }, CO: { all: '123' },
  AU: { all: '000' }, NZ: { all: '111' }, ZA: { police: '10111', ambulance: '10177' },
  IN: { all: '112' }, PK: { police: '15', ambulance: '1122' }, BD: { all: '999' },
  LK: { police: '119', ambulance: '1990' }, PH: { all: '911' }, ID: { police: '110', ambulance: '118' },
  MY: { all: '999' }, SG: { police: '999', ambulance: '995' }, TH: { police: '191', ambulance: '1669' },
  VN: { police: '113', ambulance: '115' }, CN: { police: '110', ambulance: '120' },
  JP: { police: '110', ambulance: '119' }, KR: { police: '112', ambulance: '119' },
};

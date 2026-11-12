import { normalize } from "./normalize.js";
import type { Answer } from "./types.js";

const prefixes =
  "quetta:Q,ronna:R,yotta:Y,zetta:Z,exa:E,peta:P,tera:T,giga:G,mega:M,kilo:k,hecto:h,deca:da,deci:d,centi:c,milli:m,micro:μ,nano:n,pico:p,femto:f,atto:a,zepto:z,yocto:y,ronto:r,quecto:q"
    .split(",")
    .map((entry) => entry.split(":"));
const bases =
  "metre|meter:m,gram:g,second:s,ampere:A,kelvin:K,mole:mol,candela:cd,radian:rad,steradian:sr,hertz:Hz,newton:N,pascal:Pa,joule:J,watt:W,coulomb:C,volt:V,farad:F,ohm:Ω,siemens:S,weber:Wb,tesla:T,henry:H,lumen:lm,lux:lx,becquerel:Bq,gray:Gy,sievert:Sv,katal:kat,litre|liter:L"
    .split(",")
    .map((entry) => entry.split(":"));

export const withSIPrefixes = (answers: Answer[]): Answer[] => {
  const result = [...answers];
  const byName = new Map(
    answers.flatMap((answer) =>
      [answer.label, ...answer.aliases].map((name) => [normalize(name), answer] as const),
    ),
  );
  for (const [prefix, symbol] of prefixes) {
    for (const [base, unitSymbol] of bases) {
      const aliases = base.split("|").map((name) => prefix + name);
      const label = aliases[0];
      const match = aliases.map((alias) => byName.get(normalize(alias))).find(Boolean);
      if (match) continue;
      const answer = {
        id: `si-prefix:${prefix}:${base.split("|")[0]}`,
        label,
        aliases,
        symbols: [symbol + unitSymbol],
        source: "https://www.bipm.org/en/measurement-units/si-prefixes",
      };
      result.push(answer);
      byName.set(normalize(label), answer);
    }
  }
  return result;
};

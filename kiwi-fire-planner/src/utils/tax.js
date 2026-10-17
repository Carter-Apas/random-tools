const NZ_INCOME_TAX_BRACKETS_2025_26 = [
  { upTo: 15600, rate: 0.105 },
  { upTo: 53500, rate: 0.175 },
  { upTo: 78100, rate: 0.3 },
  { upTo: 180000, rate: 0.33 },
  { upTo: Infinity, rate: 0.39 },
];

const NZ_ACC_EARNER_LEVY_RATE_2025_26 = 0.0167;
const NZ_ACC_EARNER_MAX_2025_26 = 152790;
const NZ_STUDENT_LOAN_REPAYMENT_RATE_2025_26 = 0.12;
const NZ_STUDENT_LOAN_ANNUAL_THRESHOLD_2025_26 = 24128;

export function calculateProgressiveTax(income, brackets) {
  let remainingIncome = income;
  let lowerBound = 0;
  let tax = 0;

  for (const bracket of brackets) {
    if (remainingIncome <= 0) {
      break;
    }

    const upperBound = bracket.upTo;
    const taxableInThisBracket =
      upperBound === Infinity
        ? remainingIncome
        : Math.max(Math.min(income, upperBound) - lowerBound, 0);

    tax += taxableInThisBracket * bracket.rate;
    remainingIncome -= taxableInThisBracket;
    lowerBound = upperBound;
  }

  return tax;
}

export function calculateNzStudentLoanRepayment(annualGrossSalary) {
  const income = Math.max(annualGrossSalary, 0);
  const repaymentIncome = Math.max(
    income - NZ_STUDENT_LOAN_ANNUAL_THRESHOLD_2025_26,
    0,
  );
  return repaymentIncome * NZ_STUDENT_LOAN_REPAYMENT_RATE_2025_26;
}

export function calculateNzTakeHome(
  annualGrossSalary,
  { includeStudentLoan = false } = {},
) {
  const income = Math.max(annualGrossSalary, 0);
  const incomeTax = calculateProgressiveTax(
    income,
    NZ_INCOME_TAX_BRACKETS_2025_26,
  );
  const accLevy =
    Math.min(income, NZ_ACC_EARNER_MAX_2025_26) *
    NZ_ACC_EARNER_LEVY_RATE_2025_26;
  const studentLoanRepayment = includeStudentLoan
    ? calculateNzStudentLoanRepayment(income)
    : 0;
  const takeHomeAnnual = Math.max(
    income - incomeTax - accLevy - studentLoanRepayment,
    0,
  );

  return {
    incomeTax,
    accLevy,
    studentLoanRepayment,
    studentLoanRate: NZ_STUDENT_LOAN_REPAYMENT_RATE_2025_26,
    studentLoanThreshold: NZ_STUDENT_LOAN_ANNUAL_THRESHOLD_2025_26,
    includeStudentLoan,
    takeHomeAnnual,
    takeHomeMonthly: takeHomeAnnual / 12,
  };
}

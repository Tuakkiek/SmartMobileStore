import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/orderUtils";

const defaultPlans = [
  { months: 3, interestRate: 0, provider: "HD SAISON" },
  { months: 6, interestRate: 0, provider: "HD SAISON" },
  { months: 12, interestRate: 0, provider: "FE CREDIT" },
  { months: 18, interestRate: 2.5, provider: "FE CREDIT" },
  { months: 24, interestRate: 3.0, provider: "HOME CREDIT" },
];

const calculateInstallment = (totalAmount, months, interestRate) => {
  const principal = Number(totalAmount) || 0;

  if (interestRate === 0) {
    const monthly = principal / months;
    return {
      monthlyPayment: Math.ceil(monthly / 1000) * 1000,
      totalPayment: Math.ceil(principal / 1000) * 1000,
      totalInterest: 0,
    };
  }

  const monthlyRate = interestRate / 100 / 12;
  const rawMonthly =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  const totalPayment = rawMonthly * months;
  const totalInterest = totalPayment - principal;

  return {
    monthlyPayment: Math.ceil(rawMonthly / 1000) * 1000,
    totalPayment: Math.ceil(totalPayment / 1000) * 1000,
    totalInterest: Math.ceil(totalInterest / 1000) * 1000,
  };
};

const InstallmentCalculator = ({ totalAmount, onCalculate }) => {
  const [selectedMonths, setSelectedMonths] = useState("12");

  const currentPlan = useMemo(
    () => defaultPlans.find((plan) => String(plan.months) === selectedMonths),
    [selectedMonths]
  );

  const calculation = useMemo(() => {
    if (!currentPlan) {
      return null;
    }

    return calculateInstallment(totalAmount, currentPlan.months, currentPlan.interestRate);
  }, [currentPlan, totalAmount]);

  useEffect(() => {
    if (!currentPlan || !calculation) {
      return;
    }

    onCalculate?.({
      provider: currentPlan.provider,
      months: currentPlan.months,
      interestRate: currentPlan.interestRate,
      ...calculation,
    });
  }, [currentPlan, calculation, onCalculate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Trả góp</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Chọn kỳ hạn</Label>
          <Select value={selectedMonths} onValueChange={setSelectedMonths}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn kỳ hạn" />
            </SelectTrigger>
            <SelectContent>
              {defaultPlans.map((plan) => (
                <SelectItem key={plan.months} value={String(plan.months)}>
                  {plan.months} tháng - {plan.provider}{" "}
                  {plan.interestRate === 0 ? "(0%)" : `(${plan.interestRate}%/năm)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {calculation ? (
          <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Giá sản phẩm</span>
              <span className="font-medium">{formatPrice(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trả mỗi tháng</span>
              <span className="font-semibold text-primary">
                {formatPrice(calculation.monthlyPayment)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng tiền trả</span>
              <span className="font-medium">{formatPrice(calculation.totalPayment)}</span>
            </div>
            {calculation.totalInterest > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiền lãi</span>
                <span className="font-medium text-red-600">
                  {formatPrice(calculation.totalInterest)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default InstallmentCalculator;

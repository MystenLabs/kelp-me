import { Landmark } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function StakingPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-700/50 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <CardTitle>SUI Staking</CardTitle>
            <CardDescription>
              Stake your SUI tokens to earn rewards while keeping them protected
              by KELP.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Landmark className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Coming Soon
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            SUI staking integration is currently under development. You will be
            able to stake SUI directly from your KELP-protected account and earn
            validator rewards.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

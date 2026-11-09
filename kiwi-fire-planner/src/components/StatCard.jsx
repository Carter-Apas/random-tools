import { Panel, Stat } from "@random-tools/mono";

export const StatCard = ({ title, value, subtitle }) => (
  <Panel className="planner-stat">
    <Stat label={title} value={value} detail={subtitle} />
  </Panel>
);
